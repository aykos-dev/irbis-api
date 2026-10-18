import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { vi } from 'vitest';
import { ConditionsJob } from '../src/features/conditions/conditions.job.js';
import { ConditionsService } from '../src/features/conditions/conditions.service.js';
import { OpenMeteoClient } from '../src/features/conditions/open-meteo.client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { type Account, bearer, makeAdmin, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MISSING = '0190d6a4-0000-7000-8000-000000000000';
type Named = { name: { uz: string } };
const names = (body: unknown): string[] =>
  (body as { items: Named[] }).items.map((i) => i.name.uz);

const REASON = { uz: '  Yo‘l yopiq  ', en: 'Road closed' };

// Synthetic places; open all year so the season never locks them.
let seq = 0;
async function createPlace(
  prisma: PrismaService,
  name: string,
): Promise<string> {
  seq += 1;
  const row = await prisma.place.create({
    data: {
      slug: `cond-${seq}`,
      nameUz: name,
      type: 'peak',
      latitude: 41.3 + seq / 100,
      longitude: 69.3,
      elevationM: 2000,
      difficulty: 2,
      requiredLevel: 1,
      season: Array(12).fill('possible'),
    },
  });
  return row.id;
}

describe('conditions (e2e) - AC3, AC4, AC5', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let admin: Account;
  let user: Account;

  const server = () => app.getHttpServer();
  const get = (path: string, who: Account = admin) =>
    request(server())
      .get(path)
      .set(...bearer(who.accessToken));
  const post = (path: string, body: object = {}, who: Account = admin) =>
    request(server())
      .post(path)
      .set(...bearer(who.accessToken))
      .send(body);
  const inDays = (days: number) =>
    new Date(Date.now() + days * DAY_MS).toISOString();
  const closure = (placeId: string) =>
    post(`/v1/admin/places/${placeId}/closures`, {
      startsAt: inDays(-1),
      reason: REASON,
      source: 'official',
    });
  const override = (placeId: string, status: string, uz: string) =>
    post(`/v1/admin/places/${placeId}/overrides`, {
      status,
      reason: { uz },
      expiresAt: inDays(3),
    });

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    admin = await makeAdmin(app);
    user = await signUp(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  describe('AC4 public condition', () => {
    it('200 for a guest with the empty shape, 404 unknown, 400 non-uuid', async () => {
      const id = await createPlace(prisma, 'Empty place');
      const res = await request(server())
        .get(`/v1/places/${id}/condition`)
        .expect(200);
      expect(res.body).toEqual({
        placeId: id,
        status: null,
        source: null,
        reasons: [],
        text: null,
        opensMonth: null,
        hazards: [],
        weekend: [],
        forecastAt: null,
        computedAt: null,
      });
      const missing = await request(server())
        .get(`/v1/places/${MISSING}/condition`)
        .expect(404);
      expect(missing.body.code).toBe('PLACE_NOT_FOUND');
      const bad = await request(server())
        .get('/v1/places/not-a-uuid/condition')
        .expect(400);
      expect(bad.body.code).toBe('VALIDATION_FAILED');
    });

    it('list items carry conditionStatus once a condition exists', async () => {
      const closed = await createPlace(prisma, 'Closed for list');
      await closure(closed).expect(201);
      const res = await request(server())
        .get('/v1/places')
        .query({ limit: 200 })
        .expect(200);
      const item = (res.body.items as { id: string }[]).find(
        (i) => i.id === closed,
      );
      expect(item).toMatchObject({ conditionStatus: 'not_now' });
    });
  });

  describe('AC5 closures and overrides', () => {
    it('a closure makes the place not_now at once, with its trimmed reason', async () => {
      const id = await createPlace(prisma, 'Closure place');
      const created = await closure(id).expect(201);
      expect(created.body).toEqual({
        id: expect.any(String),
        placeId: id,
        startsAt: expect.any(String),
        endsAt: null,
        reason: { uz: 'Yo‘l yopiq', ru: null, en: 'Road closed' },
        source: 'official',
        createdAt: expect.any(String),
        endedAt: null,
        active: true,
      });
      const cond = await request(server())
        .get(`/v1/places/${id}/condition`)
        .expect(200);
      expect(cond.body).toMatchObject({
        status: 'not_now',
        source: 'closure',
        reasons: [{ code: 'CLOSURE' }],
        text: { uz: 'Yo‘l yopiq', ru: null, en: 'Road closed' },
      });
    });

    it('an override beats a closure; a second override ends the first; ending twice is 409', async () => {
      const id = await createPlace(prisma, 'Override place');
      const closed = await closure(id).expect(201);
      const first = await override(id, 'go', 'first').expect(201);
      const cond = await request(server())
        .get(`/v1/places/${id}/condition`)
        .expect(200);
      expect(cond.body).toMatchObject({
        status: 'go',
        source: 'manual',
        text: { uz: 'first', ru: null, en: null },
      });

      const second = await override(id, 'caution', 'second').expect(201);
      const controls = await get(
        `/v1/admin/places/${id}/condition-controls`,
      ).expect(200);
      expect(controls.body.condition.status).toBe('caution');
      const overrides = controls.body.overrides as {
        id: string;
        active: boolean;
      }[];
      expect(overrides.map((o) => [o.id, o.active])).toEqual([
        [second.body.id, true],
        [first.body.id, false],
      ]);
      expect(controls.body.overrides[1].endedAt).not.toBeNull();
      expect(controls.body.closures).toHaveLength(1);

      await post(`/v1/admin/overrides/${second.body.id}/end`).expect(200);
      const again = await post(
        `/v1/admin/overrides/${second.body.id}/end`,
      ).expect(409);
      expect(again.body.code).toBe('OVERRIDE_ALREADY_ENDED');
      // With no override left the closure applies again.
      const after = await request(server())
        .get(`/v1/places/${id}/condition`)
        .expect(200);
      expect(after.body.status).toBe('not_now');

      const ended = await post(
        `/v1/admin/closures/${closed.body.id}/end`,
      ).expect(200);
      expect(ended.body).toMatchObject({ active: false });
      expect(ended.body.endedAt).not.toBeNull();
      const twice = await post(
        `/v1/admin/closures/${closed.body.id}/end`,
      ).expect(409);
      expect(twice.body.code).toBe('CLOSURE_ALREADY_ENDED');
      const unknown = await post(`/v1/admin/closures/${MISSING}/end`).expect(
        404,
      );
      expect(unknown.body.code).toBe('CLOSURE_NOT_FOUND');
    });

    it('400 for expiresAt beyond 14 days, endsAt before startsAt and a blank reason', async () => {
      const id = await createPlace(prisma, 'Validation place');
      const far = await post(`/v1/admin/places/${id}/overrides`, {
        status: 'go',
        reason: { uz: 'x' },
        expiresAt: inDays(14.1),
      }).expect(400);
      expect(far.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        fieldErrors: { expiresAt: expect.any(Array) },
      });
      const backwards = await post(`/v1/admin/places/${id}/closures`, {
        startsAt: inDays(2),
        endsAt: inDays(1),
        reason: { uz: 'x' },
        source: 'admin',
      }).expect(400);
      expect(backwards.body.fieldErrors).toHaveProperty('endsAt');
      const blank = await post(`/v1/admin/places/${id}/closures`, {
        startsAt: inDays(0),
        reason: { uz: '   ' },
        source: 'admin',
      }).expect(400);
      expect(blank.body.fieldErrors).toHaveProperty(['reason.uz']);
    });

    it('admin routes: 401 without a token, 403 for a normal user', async () => {
      await request(server()).get('/v1/admin/conditions').expect(401);
      const res = await get('/v1/admin/conditions', user).expect(403);
      expect(res.body.code).toBe('FORBIDDEN');
      await post('/v1/admin/conditions/recompute', {}, user).expect(403);
    });
  });

  describe('AC5 list and recompute', () => {
    it('lists by name with a status filter, cursor pages and a stable total', async () => {
      const seen: string[] = [];
      let cursor: string | null = null;
      let total: number;
      do {
        const res: request.Response = await get(
          `/v1/admin/conditions?limit=2${cursor ? `&cursor=${cursor}` : ''}`,
        ).expect(200);
        total = res.body.total;
        seen.push(...names(res.body));
        cursor = res.body.nextCursor;
      } while (cursor);
      expect(seen).toHaveLength(total);
      expect(seen).toEqual([...seen].sort());

      const notNow = await get('/v1/admin/conditions?status=not_now').expect(
        200,
      );
      expect(notNow.body.total).toBeGreaterThan(0);
      for (const row of notNow.body.items) {
        expect(row.status).toBe('not_now');
        expect(row.activeClosureId).toEqual(expect.any(String));
      }
      const none = await get('/v1/admin/conditions?status=none').expect(200);
      expect(names(none.body)).toContain('Empty place');
    });

    it('202 starts a run in the background; 409 RECOMPUTE_RUNNING while it runs', async () => {
      let release: () => void = () => undefined;
      const fetch = vi
        .spyOn(app.get(OpenMeteoClient), 'fetchDaily')
        .mockImplementation(
          (batch) =>
            new Promise((resolve) => {
              release = () => resolve(batch.map(() => ({ time: [] })));
            }),
        );
      const started = await post('/v1/admin/conditions/recompute').expect(202);
      expect(started.body.startedAt).toEqual(expect.any(String));
      const busy = await post('/v1/admin/conditions/recompute').expect(409);
      expect(busy.body.code).toBe('RECOMPUTE_RUNNING');
      await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
      release();
      const job = app.get(ConditionsJob);
      await vi.waitFor(() => expect(job.isRunning()).toBe(false));
      fetch.mockRestore();
    });
  });
  describe('AC3 expired override and inactive closures are ignored', () => {
    const condition = (id: string) =>
      request(server()).get(`/v1/places/${id}/condition`).expect(200);
    const recompute = (id: string) =>
      app.get(ConditionsService).recomputePlace(id, new Date());

    it('an override past its expiresAt is ignored; the closure applies', async () => {
      const id = await createPlace(prisma, 'Expired override place');
      await closure(id).expect(201);
      const created = await override(id, 'go', 'expired').expect(201);
      expect((await condition(id)).body.status).toBe('go');

      await prisma.conditionOverride.update({
        where: { id: created.body.id },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });
      await recompute(id);
      expect((await condition(id)).body).toMatchObject({
        status: 'not_now',
        source: 'closure',
        reasons: [{ code: 'CLOSURE' }],
      });
    });

    it('a closure that has not started yet does not make the place not_now', async () => {
      const id = await createPlace(prisma, 'Future closure place');
      const created = await post(`/v1/admin/places/${id}/closures`, {
        startsAt: inDays(1),
        reason: { uz: 'later' },
        source: 'admin',
      }).expect(201);
      expect(created.body.active).toBe(false);
      const res = await condition(id);
      expect(res.body.status).not.toBe('not_now');
      expect(res.body.source).not.toBe('closure');
    });

    it('a closure whose endsAt has passed does not make the place not_now', async () => {
      const id = await createPlace(prisma, 'Past closure place');
      const created = await post(`/v1/admin/places/${id}/closures`, {
        startsAt: inDays(-2),
        endsAt: inDays(1),
        reason: { uz: 'over' },
        source: 'admin',
      }).expect(201);
      expect((await condition(id)).body.status).toBe('not_now');

      await prisma.closure.update({
        where: { id: created.body.id },
        data: { endsAt: new Date(Date.now() - 60_000) },
      });
      await recompute(id);
      const res = await condition(id);
      expect(res.body.status).not.toBe('not_now');
      expect(res.body.source).not.toBe('closure');
    });
  });
});
