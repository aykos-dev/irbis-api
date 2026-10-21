import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { NestExpressApplication } from '@nestjs/platform-express';
import sharp from 'sharp';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { type Account, bearer, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const BUCKET = 'avatars-e2e';
const PUBLIC_BASE = 'http://localhost:9000/avatars-e2e';
type S3Stub = { server: Server; objects: Map<string, Buffer> };

/** Minimal path-style S3 endpoint (PUT / HEAD) so the real S3 client is exercised without MinIO. */
function startS3Stub(): Promise<S3Stub> {
  const objects = new Map<string, Buffer>();
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '').split('?')[0]);
    const prefix = `/${BUCKET}/`;
    const objectKey = path.startsWith(prefix)
      ? path.slice(prefix.length)
      : null;
    if (objectKey === null) {
      res.writeHead(404).end();
      return;
    }
    if (req.method === 'PUT') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        objects.set(objectKey, Buffer.concat(chunks));
        res.writeHead(200, { ETag: '"e2e"' }).end();
      });
      return;
    }
    const stored = objects.get(objectKey);
    if (req.method === 'HEAD' && stored) {
      res.writeHead(200, { 'Content-Length': stored.length }).end();
      return;
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ server, objects })),
  );
}

const png = (width: number, height: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: '#336699' } })
    .png()
    .toBuffer();

describe('profile account API (e2e) - AC3, AC8', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let s3: S3Stub;

  const server = () => app.getHttpServer();
  const me = (account: Account) =>
    request(server())
      .get('/v1/me')
      .set(...bearer(account.accessToken));
  const patch = (account: Account, body: Record<string, unknown>) =>
    request(server())
      .patch('/v1/me')
      .set(...bearer(account.accessToken))
      .send(body);
  const upload = (account: Account, bytes: Buffer) =>
    request(server())
      .post('/v1/me/avatar')
      .set(...bearer(account.accessToken))
      .attach('file', bytes, 'avatar.png');
  const removeAvatar = (account: Account) =>
    request(server())
      .delete('/v1/me/avatar')
      .set(...bearer(account.accessToken));
  const deleteAccount = (account: Account, body: Record<string, unknown>) =>
    request(server())
      .delete('/v1/me')
      .set(...bearer(account.accessToken))
      .send(body);
  const profile = (username: string) =>
    request(server()).get(`/v1/users/${username}`);

  beforeAll(async () => {
    db = await startPostgres();
    s3 = await startS3Stub();
    const { port } = s3.server.address() as AddressInfo;
    app = await createE2eApp(
      e2eEnv(db.getConnectionUri(), {
        S3_ENDPOINT: `http://127.0.0.1:${port}`,
        S3_BUCKET: BUCKET,
        S3_PUBLIC_BASE_URL: PUBLIC_BASE,
      }),
    );
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
    await new Promise((resolve) => s3?.server.close(resolve));
  });

  it('AC3: upload returns avatarUrl, remove clears it and the object stays orphaned', async () => {
    const account = await signUp(app);

    await request(server())
      .post('/v1/me/avatar')
      .set(...bearer(account.accessToken))
      .expect(400);
    const badBytes = await request(server())
      .post('/v1/me/avatar')
      .set(...bearer(account.accessToken))
      .attach('file', Buffer.from('plain text'), 'avatar.jpg')
      .expect(415);
    expect(badBytes.body.code).toBe('IMAGE_TYPE');
    const tooLarge = await request(server())
      .post('/v1/me/avatar')
      .set(...bearer(account.accessToken))
      .attach('file', Buffer.alloc(2 * 1024 * 1024 + 1), 'big.jpg')
      .expect(413);
    expect(tooLarge.body.code).toBe('IMAGE_TOO_LARGE');

    const uploaded = await upload(account, await png(900, 450)).expect(200);
    const avatarUrl = uploaded.body.avatarUrl as string;
    expect(avatarUrl).toMatch(
      new RegExp(`^${PUBLIC_BASE}/avatars/[0-9a-f-]{36}\\.jpg$`),
    );
    expect((await me(account).expect(200)).body.avatarUrl).toBe(avatarUrl);

    const key = avatarUrl.slice(`${PUBLIC_BASE}/`.length);
    const stored = await sharp(s3.objects.get(key)).metadata();
    expect(stored).toMatchObject({ format: 'jpeg', width: 512, height: 512 });

    const removed = await removeAvatar(account).expect(200);
    expect(removed.body.avatarUrl).toBeNull();
    expect((await me(account).expect(200)).body.avatarUrl).toBeNull();
    expect(s3.objects.has(key)).toBe(true);
  });

  it('AC8: delete needs the password, anonymises the account and kills every session', async () => {
    const account = await signUp(app);
    await patch(account, {
      displayName: 'Sardor',
      bio: 'Explorer',
      homeRegion: 'samarkand',
      interests: ['peaks'],
    }).expect(200);
    await upload(account, await png(300, 300)).expect(200);

    const missing = await deleteAccount(account, {}).expect(400);
    expect(missing.body.fieldErrors).toEqual({ currentPassword: ['required'] });
    const wrong = await deleteAccount(account, {
      currentPassword: 'totally-wrong-42',
    }).expect(401);
    expect(wrong.body.code).toBe('INVALID_PASSWORD');
    expect((await me(account).expect(200)).body.displayName).toBe('Sardor');

    await deleteAccount(account, { currentPassword: account.password }).expect(
      204,
    );

    expect((await me(account).expect(401)).body.code).toBe('UNAUTHENTICATED');
    const oldLogin = await request(server())
      .post('/v1/auth/log-in')
      .send({ username: account.username, password: account.password })
      .expect(401);
    expect(oldLogin.body.code).toBe('INVALID_CREDENTIALS');
    await request(server())
      .post('/v1/auth/refresh')
      .send({ refreshToken: account.refreshToken })
      .expect(401);
    expect((await profile(account.username).expect(404)).body.code).toBe(
      'PROFILE_NOT_FOUND',
    );

    const row = await prisma.user.findUniqueOrThrow({
      where: { id: account.id },
    });
    expect(row.username).toMatch(/^deleted_[0-9a-f]{12}$/);
    expect(row.username).toHaveLength(20);
    expect(row).toMatchObject({
      displayName: null,
      bio: null,
      avatarKey: null,
      homeRegion: null,
      interests: [],
      experience: null,
      recoveryPhone: null,
      recoveryPhoneVerifiedAt: null,
      deletedAt: expect.any(Date),
    });
    expect(row.passwordHash).not.toBe(account.password);
    expect(
      await prisma.refreshToken.count({
        where: { userId: account.id, revokedAt: null },
      }),
    ).toBe(0);
  });
});
