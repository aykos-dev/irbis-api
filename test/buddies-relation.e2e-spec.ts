import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedGameConfig } from '../prisma/seed/seed.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('buddy relation (e2e) - GET /v1/users/:username/buddy-relation', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  const server = () => app.getHttpServer();
  const relation = (target: Account, viewer?: Account) => {
    const req = request(server()).get(
      `/v1/users/${target.username}/buddy-relation`,
    );
    return viewer ? req.set(...bearer(viewer.accessToken)) : req;
  };

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    await seedGameConfig(app.get(PrismaService));
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('none -> outgoing -> incoming with linkId -> buddies', async () => {
    const [a, b] = await Promise.all([signUp(app), signUp(app)]);
    expect((await relation(b, a).expect(200)).body).toEqual({
      userId: b.id,
      relation: 'none',
      linkId: null,
    });
    const sent = await request(server())
      .post('/v1/buddies/requests')
      .set(...bearer(a.accessToken))
      .send({ userId: b.id })
      .expect(201);
    expect((await relation(b, a).expect(200)).body).toEqual({
      userId: b.id,
      relation: 'outgoing',
      linkId: null,
    });
    expect((await relation(a, b).expect(200)).body).toEqual({
      userId: a.id,
      relation: 'incoming',
      linkId: sent.body.id,
    });
    await request(server())
      .post(`/v1/buddies/requests/${sent.body.id as string}/accept`)
      .set(...bearer(b.accessToken))
      .expect(200);
    expect((await relation(a, b).expect(200)).body).toEqual({
      userId: a.id,
      relation: 'buddies',
      linkId: null,
    });
  });

  it('anonymous is none, own profile is self, unknown username 404', async () => {
    const a = await signUp(app);
    expect((await relation(a).expect(200)).body).toEqual({
      userId: a.id,
      relation: 'none',
      linkId: null,
    });
    expect((await relation(a, a).expect(200)).body).toEqual({
      userId: a.id,
      relation: 'self',
      linkId: null,
    });
    await request(server())
      .get('/v1/users/no-such-user-xyz/buddy-relation')
      .expect(404)
      .expect((res) => expect(res.body.code).toBe('PROFILE_NOT_FOUND'));
  });
});
