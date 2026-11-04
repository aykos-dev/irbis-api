import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('groups (e2e) - public/private membership and transferable ownership', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let owner: Account;
  let member: Account;
  let invitee: Account;
  let publicId: string;
  let privateId: string;
  const server = () => app.getHttpServer();
  const auth = (account: Account) => bearer(account.accessToken);

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    owner = await signUp(app);
    member = await signUp(app);
    invitee = await signUp(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('creates public and private groups with the creator as owner', async () => {
    const publicGroup = await request(server())
      .post('/v1/groups')
      .set(...auth(owner))
      .send({ name: 'Tashkent Trail Friends', description: 'Weekend walks together', visibility: 'public' })
      .expect(201);
    publicId = publicGroup.body.id as string;
    expect(publicGroup.body).toMatchObject({
      memberCount: 1,
      viewerMembership: { role: 'owner', status: 'active' },
    });

    const privateGroup = await request(server())
      .post('/v1/groups')
      .set(...auth(owner))
      .send({ name: 'Private Ridge Team', description: 'Invite or approval only', visibility: 'private' })
      .expect(201);
    privateId = privateGroup.body.id as string;

    const guest = await request(server()).get('/v1/groups').expect(200);
    const discover = (guest.body as { discover: { id: string }[] }).discover;
    expect(discover.map((group) => group.id)).toContain(publicId);
    expect(discover.map((group) => group.id)).not.toContain(privateId);
  });

  it('joins public groups immediately and private groups through approval', async () => {
    await request(server()).post(`/v1/groups/${publicId}/join`).set(...auth(member)).expect(201)
      .expect(({ body }) => expect(body.status).toBe('joined'));

    await request(server()).post(`/v1/groups/${privateId}/join`).set(...auth(member)).expect(201)
      .expect(({ body }) => expect(body.status).toBe('pending'));
    const ownerView = await request(server()).get(`/v1/groups/${privateId}`).set(...auth(owner)).expect(200);
    const pending = (ownerView.body as { pendingRequests: { userId: string }[] }).pendingRequests;
    expect(pending.map((row) => row.userId)).toContain(member.id);

    await request(server()).post(`/v1/groups/${privateId}/requests/${member.id}/approve`).set(...auth(owner)).expect(201);
    const memberView = await request(server()).get(`/v1/groups/${privateId}`).set(...auth(member)).expect(200);
    expect(memberView.body.viewerMembership.status).toBe('active');
  });

  it('supports private invitations, admin promotion and ownership transfer', async () => {
    await request(server()).post(`/v1/groups/${privateId}/invitations`).set(...auth(owner))
      .send({ username: invitee.username }).expect(201);
    const home = await request(server()).get('/v1/groups').set(...auth(invitee)).expect(200);
    const invitations = (home.body as { invitations: { id: string }[] }).invitations;
    expect(invitations.map((group) => group.id)).toContain(privateId);
    await request(server()).post(`/v1/groups/${privateId}/invitations/accept`).set(...auth(invitee)).expect(201);

    await request(server()).patch(`/v1/groups/${privateId}/members/${member.id}/admin`).set(...auth(owner))
      .send({ admin: true }).expect(200);
    await request(server()).post(`/v1/groups/${privateId}/ownership/${member.id}`).set(...auth(owner)).expect(201);
    const newOwner = await request(server()).get(`/v1/groups/${privateId}`).set(...auth(member)).expect(200);
    expect(newOwner.body.viewerMembership.role).toBe('owner');
  });

  it('returns public groups from the Groups search scope', async () => {
    const search = await request(server()).get('/v1/search?q=trail&scope=groups').expect(200);
    expect(search.body.groups).toEqual([
      expect.objectContaining({ id: publicId, name: 'Tashkent Trail Friends', memberCount: 2 }),
    ]);
    expect(search.body.tours).toEqual([]);
  });
});

