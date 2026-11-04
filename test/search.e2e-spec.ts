import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

type PersonResult = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
};
type PlaceResult = {
  slug: string;
  type: string;
  distanceM: number;
  name: { uz: string; ru: string | null; en: string | null };
};
type SearchBody = {
  places: PlaceResult[];
  people: PersonResult[];
  groups: string[];
  tours: string[];
};
const bodyOf = (res: { body: unknown }): SearchBody => res.body as SearchBody;

describe('search (e2e) - places, people, empty groups and tours', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let visible: Account;
  let privateUser: Account;
  let hidden: Account;
  const server = () => app.getHttpServer();

  const search = (query: string, user?: Account, extra = '') => {
    const call = request(server()).get(`/v1/search?q=${encodeURIComponent(query)}${extra}`);
    return user ? call.set(...bearer(user.accessToken)) : call;
  };

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    const places = [
      {
        slug: 'big-chimgan',
        nameUz: 'Katta Chimyon',
        nameRu: 'Большой Чимган',
        nameEn: 'Big Chimgan',
        type: 'peak' as const,
        latitude: 41.42,
        longitude: 70.02,
        elevationM: 3309,
      },
      {
        slug: 'chimgan-plateau-camp',
        nameUz: 'Chimyon platosi',
        nameRu: 'Плато Чимган',
        nameEn: 'Chimgan plateau camp',
        type: 'camping' as const,
        latitude: 41.41,
        longitude: 70.01,
        elevationM: 2000,
      },
      {
        slug: 'small-chimgan-trail',
        nameUz: 'Kichik Chimyon',
        nameRu: 'Малый Чимган',
        nameEn: 'Small Chimgan trail',
        type: 'trail' as const,
        latitude: 41.4,
        longitude: 70.0,
        elevationM: 1800,
      },
      {
        slug: 'far-lake',
        nameUz: 'Uzoq ko‘l',
        nameRu: 'Дальнее озеро',
        nameEn: 'Far lake',
        type: 'lake' as const,
        latitude: 39.9,
        longitude: 65.0,
        elevationM: 900,
      },
    ];
    for (const place of places) {
      await prisma.place.create({
        data: {
          ...place,
          difficulty: 1,
          requiredLevel: 1,
        },
      });
    }

    visible = await signUp(app);
    await prisma.user.update({
      where: { id: visible.id },
      data: { displayName: 'Chimgan Guide Aziz' },
    });
    privateUser = await signUp(app);
    await prisma.user.update({
      where: { id: privateUser.id },
      data: {
        displayName: 'Chimgan Private Laylo',
        publicProfile: false,
      },
    });
    hidden = await signUp(app);
    await prisma.user.update({
      where: { id: hidden.id },
      data: { displayName: 'Chimgan Hidden Bob', findBuddies: false },
    });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('matches place names and ranks prefix matches first', async () => {
    const res = await search('chim').expect(200);
    const body = bodyOf(res);
    expect(body.places.map((place) => place.slug)).toEqual([
      'chimgan-plateau-camp',
      'big-chimgan',
      'small-chimgan-trail',
    ]);
    expect(body.places[0]).toMatchObject({
      name: { en: 'Chimgan plateau camp' },
      type: 'camping',
      distanceM: expect.any(Number) as unknown,
    });
    expect(body.people.map((p) => p.username)).toEqual([visible.username]);
    expect(body.groups).toEqual([]);
    expect(body.tours).toEqual([]);
  });

  it('matches slugs and regions, and honours the device origin', async () => {
    const bySlug = await search('far-lake').expect(200);
    expect(bodyOf(bySlug).places.map((p) => p.slug)).toEqual(['far-lake']);
    const near = await search('chim', undefined, '&lat=41.42&lng=70.02').expect(200);
    const far = await search('chim', undefined, '&lat=39.9&lng=65').expect(200);
    expect(bodyOf(near).places[0].distanceM).toBeLessThan(
      bodyOf(far).places[0].distanceM,
    );
  });

  it('finds only public, findable people and hides the caller', async () => {
    const guest = await search('chimgan').expect(200);
    expect(bodyOf(guest).people.map((person) => person.username)).toEqual([
      visible.username,
    ]);

    const signedIn = await search('chimgan', visible).expect(200);
    expect(signedIn.body.people).toEqual([]);

    const exact = await search(visible.username).expect(200);
    expect(exact.body.people[0]).toMatchObject({
      username: visible.username,
      displayName: 'Chimgan Guide Aziz',
      avatarUrl: null,
      level: 1,
    });
  });

  it('respects the scope', async () => {
    const people = await search('chim', undefined, '&scope=people').expect(200);
    expect(people.body.places).toEqual([]);
    expect(people.body.people.length).toBeGreaterThan(0);

    const places = await search('chim', undefined, '&scope=places').expect(200);
    expect(places.body.places.length).toBe(3);
    expect(places.body.people).toEqual([]);

    const groups = await search('chim', undefined, '&scope=groups').expect(200);
    expect(groups.body).toEqual({ places: [], people: [], groups: [], tours: [] });
  });

  it('rejects queries shorter than two characters and unknown scopes', async () => {
    await search('c')
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('VALIDATION_FAILED'));
    await search('   ')
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('VALIDATION_FAILED'));
    await search('chim', undefined, '&scope=podcasts')
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('VALIDATION_FAILED'));
  });

  it('never returns deleted or blocked accounts', async () => {
    const deleted = await signUp(app);
    await prisma.user.update({
      where: { id: deleted.id },
      data: { displayName: 'Chimgan Deleted', deletedAt: new Date() },
    });
    const blocked = await signUp(app);
    await prisma.user.update({
      where: { id: blocked.id },
      data: {
        displayName: 'Chimgan Blocked',
        blockedAt: new Date(),
        blockReasonCode: 'spam',
      },
    });
    const res = await search('chimgan').expect(200);
    const names = bodyOf(res).people.map((person) => person.displayName);
    expect(names).not.toContain('Chimgan Deleted');
    expect(names).not.toContain('Chimgan Blocked');
    expect(names).not.toContain('Chimgan Private Laylo');
    expect(names).not.toContain('Chimgan Hidden Bob');
  });
});
