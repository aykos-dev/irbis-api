import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { createE2eApp } from './setup/app.js';
import {
  type Account,
  bearer,
  makeAdmin,
  resetAttempts,
  signUp,
} from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

type L10n = { uz: string; ru: string; en: string };
const full = (word: string): L10n => ({
  uz: `${word}_uz`,
  ru: `${word}_ru`,
  en: `${word}_en`,
});
const question = (over: Record<string, unknown> = {}) => ({
  prompt: full('prompt'),
  hint: null,
  options: [full('a'), full('b'), full('c')],
  correctIndex: 1,
  explanation: full('why'),
  wrongExplanation: null,
  image: null,
  ...over,
});

type Item = { id: string; key: string; order: number };
const items = (res: request.Response): Item[] =>
  (res.body as { items: Item[] }).items;

describe('lessons admin API (e2e) - AC1-AC3', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let admin: Account;
  let user: Account;

  const server = () => app.getHttpServer();
  const call = (
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    body?: object,
    who: Account = admin,
  ) => {
    const agent = request(server());
    const req = agent[method](`/v1/admin${path}`).set(
      ...bearer(who.accessToken),
    );
    return body ? req.send(body) : req;
  };
  const tierIds = async (): Promise<string[]> =>
    items(await call('get', '/lesson-tiers').expect(200)).map((t) => t.id);
  const newLesson = async (tierId: string): Promise<string> =>
    (
      await call('post', '/lessons', {
        tierId,
        title: full('lesson'),
        icon: 'compass',
      }).expect(201)
    ).body.id as string;

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    admin = await makeAdmin(app);
    user = await signUp(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  beforeEach(async () => {
    await resetAttempts(app);
  });

  it('401 without a token, 403 for a user', async () => {
    await request(server()).get('/v1/admin/lesson-tiers').expect(401);
    const res = await call('get', '/lesson-tiers', undefined, user).expect(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('AC1: seeded tiers; create, key taken, key immutable, reorder, TIER_NOT_EMPTY, delete', async () => {
    const seeded = await call('get', '/lesson-tiers').expect(200);
    expect(items(seeded).map((t) => t.key)).toEqual([
      '1',
      '2',
      '3',
      '4',
      'first-aid',
      '5',
    ]);
    expect(seeded.body.items[0]).toMatchObject({
      order: 1,
      colour: '#58CC02',
      title: { en: 'Trail Basics' },
      lessonCount: 0,
      publishedCount: 0,
    });

    const created = await call('post', '/lesson-tiers', {
      key: 'extra-1',
      title: full('tier'),
      colour: '#123ABC',
    }).expect(201);
    expect(created.body).toMatchObject({ key: 'extra-1', order: 7 });
    const id = created.body.id as string;

    const taken = await call('post', '/lesson-tiers', {
      key: 'extra-1',
      title: full('tier'),
      colour: '#123ABC',
    }).expect(409);
    expect(taken.body.code).toBe('TIER_KEY_TAKEN');

    const keyChange = await call('patch', `/lesson-tiers/${id}`, {
      key: 'other',
    }).expect(400);
    expect(keyChange.body.code).toBe('VALIDATION_FAILED');
    const recoloured = await call('patch', `/lesson-tiers/${id}`, {
      colour: '#000000',
    }).expect(200);
    expect(recoloured.body).toMatchObject({
      key: 'extra-1',
      colour: '#000000',
    });

    const ids = await tierIds();
    const bad = await call('post', '/lesson-tiers/reorder', {
      ids: ids.slice(1),
    }).expect(400);
    expect(bad.body.code).toBe('VALIDATION_FAILED');
    const reversed = [...ids].reverse();
    const reordered = await call('post', '/lesson-tiers/reorder', {
      ids: reversed,
    }).expect(200);
    expect(items(reordered).map((t) => [t.id, t.order])).toEqual(
      reversed.map((tid, i) => [tid, i + 1]),
    );
    await call('post', '/lesson-tiers/reorder', { ids }).expect(200);

    const lessonId = await newLesson(id);
    const notEmpty = await call('delete', `/lesson-tiers/${id}`).expect(409);
    expect(notEmpty.body.code).toBe('TIER_NOT_EMPTY');
    await call('delete', `/lessons/${lessonId}`).expect(204);
    await call('delete', `/lesson-tiers/${id}`).expect(204);
  });

  it('AC2: lesson list, reorder and PUT structure errors with exact paths', async () => {
    const [tierId] = await tierIds();
    const first = await newLesson(tierId);
    const second = await newLesson(tierId);
    const reordered = await call(
      'post',
      `/lesson-tiers/${tierId}/lessons/reorder`,
      { ids: [second, first] },
    ).expect(200);
    expect(items(reordered).map((l) => l.id)).toEqual([second, first]);
    await call('post', `/lesson-tiers/${tierId}/lessons/reorder`, {
      ids: [second],
    }).expect(400);

    const invalid = await call('put', `/lessons/${first}`, {
      title: { ru: '', en: '' },
      icon: 'compass',
      questions: [
        question(),
        question({ options: [full('a')] }),
        question(),
        question({
          options: [full('a'), { uz: '', ru: 'x'.repeat(121), en: '' }],
        }),
      ],
    }).expect(400);
    expect(invalid.body.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(invalid.body.fieldErrors).sort()).toEqual([
      'questions.1.options',
      'questions.3.options.1.ru',
      'title.uz',
    ]);

    const saved = await call('put', `/lessons/${first}`, {
      title: { uz: 'draft', ru: '', en: '' },
      icon: 'leaf',
      questions: [question({ image: { key: 'lessons/example.webp' } })],
    }).expect(200);
    expect(saved.body).toMatchObject({
      status: 'draft',
      icon: 'leaf',
      questionCount: 1,
      questions: [
        {
          order: 1,
          correctIndex: 1,
          image: { key: 'lessons/example.webp', url: null },
        },
      ],
    });
    const list = await call('get', `/lesson-tiers/${tierId}/lessons`).expect(
      200,
    );
    expect(list.body.items[1]).toMatchObject({ id: first, questionCount: 1 });
  });

  it('AC3: publish 422 paths, publish, PUT on published 422, delete 409, unpublish', async () => {
    const [, tierId] = await tierIds();
    const id = await newLesson(tierId);
    await call('put', `/lessons/${id}`, {
      title: { uz: 'x', ru: '', en: 'x' },
      icon: 'compass',
      questions: [question({ wrongExplanation: { uz: 'w', ru: '', en: 'w' } })],
    }).expect(200);

    const blocked = await call('post', `/lessons/${id}/publish`).expect(422);
    expect(blocked.body.code).toBe('LESSON_NOT_PUBLISHABLE');
    expect(blocked.body.fieldErrors).toEqual({
      'title.ru': ['blank'],
      questions: ['count'],
      'questions.0.wrongExplanation.ru': ['blank'],
    });

    const ready = {
      title: full('title'),
      icon: 'compass',
      questions: Array.from({ length: 5 }, () => question()),
    };
    await call('put', `/lessons/${id}`, ready).expect(200);
    const published = await call('post', `/lessons/${id}/publish`).expect(200);
    expect(published.body.status).toBe('published');
    const publishedAt = published.body.publishedAt as string;
    expect(publishedAt).toEqual(expect.any(String));

    const broken = await call('put', `/lessons/${id}`, {
      ...ready,
      questions: [question({ prompt: { uz: '', ru: 'p', en: 'p' } })],
    }).expect(422);
    expect(broken.body.fieldErrors).toEqual({
      questions: ['count'],
      'questions.0.prompt.uz': ['blank'],
    });
    const unchanged = await call('get', `/lessons/${id}`).expect(200);
    expect(unchanged.body.questionCount).toBe(5);

    const conflict = await call('delete', `/lessons/${id}`).expect(409);
    expect(conflict.body.code).toBe('LESSON_PUBLISHED');

    const tiers = await call('get', '/lesson-tiers').expect(200);
    expect(items(tiers).find((t) => t.id === tierId)).toMatchObject({
      lessonCount: 1,
      publishedCount: 1,
    });

    const draft = await call('post', `/lessons/${id}/unpublish`).expect(200);
    expect(draft.body).toMatchObject({ status: 'draft', publishedAt });
    const again = await call('post', `/lessons/${id}/publish`).expect(200);
    expect(again.body.publishedAt).toBe(publishedAt);
    await call('post', `/lessons/${id}/unpublish`).expect(200);
    await call('delete', `/lessons/${id}`).expect(204);
    await call('get', `/lessons/${id}`).expect(404);
  });
});
