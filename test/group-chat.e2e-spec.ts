import type { AddressInfo } from 'node:net';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import WebSocket, { type RawData } from 'ws';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('group chat (e2e) - messages, mentions, replies, reactions and receipts', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let owner: Account;
  let member: Account;
  let groupId: string;
  let messageId: string;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    owner = await signUp(app);
    member = await signUp(app);
    const group = await request(server())
      .post('/v1/groups')
      .set(...bearer(owner.accessToken))
      .send({
        name: 'Chat Hikers',
        description: 'Chat verification group',
        visibility: 'public',
      })
      .expect(201);
    groupId = group.body.id as string;
    await request(server())
      .post(`/v1/groups/${groupId}/join`)
      .set(...bearer(member.accessToken))
      .expect(201);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('sends a mention and creates only the mention notification', async () => {
    const sent = await request(server())
      .post(`/v1/groups/${groupId}/messages`)
      .set(...bearer(owner.accessToken))
      .send({ body: `Ready for Saturday, @${member.username}?` })
      .expect(201);
    messageId = sent.body.id as string;
    expect(sent.body).toMatchObject({
      body: `Ready for Saturday, @${member.username}?`,
      author: { id: owner.id, verifiedLeader: false },
      mentionedUserIds: [member.id],
    });
    const notifications = await request(server())
      .get('/v1/notifications')
      .set(...bearer(member.accessToken))
      .expect(200);
    expect(notifications.body.items).toEqual([
      expect.objectContaining({
        kind: 'group_mention',
        data: { groupId, messageId },
      }),
    ]);
  });

  it('supports replies, place attachments and emoji reactions', async () => {
    const place = await prisma.place.create({
      data: {
        slug: 'chat-place',
        nameUz: 'Chat joyi',
        nameEn: 'Chat place',
        type: 'trail',
        latitude: 41.2,
        longitude: 69.2,
        elevationM: 1200,
        difficulty: 1,
        requiredLevel: 1,
      },
    });
    const reply = await request(server())
      .post(`/v1/groups/${groupId}/messages`)
      .set(...bearer(member.accessToken))
      .send({
        body: 'Yes!',
        replyToId: messageId,
        attachments: [{ type: 'place', placeId: place.id }],
      })
      .expect(201);
    expect(reply.body).toMatchObject({
      replyTo: { id: messageId, username: owner.username },
      attachments: [
        { type: 'place', placeId: place.id, placeName: 'Chat place' },
      ],
    });
    await request(server())
      .put(`/v1/groups/${groupId}/messages/${messageId}/reactions`)
      .set(...bearer(member.accessToken))
      .send({ emoji: '👍' })
      .expect(200);
    const history = await request(server())
      .get(`/v1/groups/${groupId}/messages`)
      .set(...bearer(member.accessToken))
      .expect(200);
    const original = (
      history.body as { items: { id: string; reactions: unknown[] }[] }
    ).items.find((item) => item.id === messageId);
    expect(original?.reactions).toEqual([
      { emoji: '👍', count: 1, mine: true },
    ]);
  });

  it('edits, marks read, then deletes while preserving the tombstone', async () => {
    await request(server())
      .patch(`/v1/groups/${groupId}/messages/${messageId}`)
      .set(...bearer(owner.accessToken))
      .send({ body: 'Updated plan' })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          body: 'Updated plan',
          editedAt: expect.any(String) as unknown,
        }),
      );
    await request(server())
      .post(`/v1/groups/${groupId}/messages/read`)
      .set(...bearer(member.accessToken))
      .send({ messageId })
      .expect(201);
    await request(server())
      .delete(`/v1/groups/${groupId}/messages/${messageId}`)
      .set(...bearer(owner.accessToken))
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          body: null,
          deletedAt: expect.any(String) as unknown,
        }),
      );
  });

  it('returns seeded-style trip cards as read-only system messages', async () => {
    await prisma.groupMessage.create({
      data: {
        groupId,
        kind: 'trip',
        tripData: {
          title: 'Beldersay Ridge sunrise',
          startsAt: '2026-11-07T00:30:00.000Z',
          meetingTime: '05:30',
          difficulty: 3,
          requiredLevel: 3,
          capacity: 10,
          joined: 0,
          condition: 'go',
          imageUrl: null,
        },
      },
    });
    const history = await request(server())
      .get(`/v1/groups/${groupId}/messages`)
      .set(...bearer(member.accessToken))
      .expect(200);
    expect(history.body.items).toContainEqual(
      expect.objectContaining({
        kind: 'trip',
        author: null,
        trip: expect.objectContaining({ title: 'Beldersay Ridge sunrise' }),
      }),
    );
  });

  it('authenticates socket rooms and broadcasts presence, typing and durable events', async () => {
    const address = app.getHttpServer().address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/v1/groups/chat`;
    const ownerProbe = new SocketProbe(url);
    const memberProbe = new SocketProbe(url);
    await Promise.all([ownerProbe.opened, memberProbe.opened]);
    await Promise.all([
      ownerProbe.wait('auth.required'),
      memberProbe.wait('auth.required'),
    ]);

    ownerProbe.send('auth', { token: owner.accessToken, groupId });
    await ownerProbe.wait('auth.ok');
    memberProbe.send('auth', { token: member.accessToken, groupId });
    await memberProbe.wait('auth.ok');
    await ownerProbe.wait(
      'presence',
      (data) => objectNumber(data, 'onlineCount') === 2,
    );

    memberProbe.send('typing', { groupId, typing: true });
    await ownerProbe.wait(
      'typing',
      (data) => objectString(data, 'userId') === member.id,
    );

    const liveBody = `Live update ${Date.now()}`;
    await request(server())
      .post(`/v1/groups/${groupId}/messages`)
      .set(...bearer(owner.accessToken))
      .send({ body: liveBody })
      .expect(201);
    await memberProbe.wait('message.created', (data) => {
      if (!data || typeof data !== 'object' || Array.isArray(data))
        return false;
      const message = (data as Record<string, unknown>).message;
      return objectString(message, 'body') === liveBody;
    });

    ownerProbe.close();
    memberProbe.close();
  });
});

interface SocketFrame {
  event: string;
  data: unknown;
}

class SocketProbe {
  readonly socket: WebSocket;
  readonly opened: Promise<void>;
  private readonly frames: SocketFrame[] = [];
  private readonly listeners = new Set<() => void>();

  constructor(url: string) {
    this.socket = new WebSocket(url);
    this.opened = new Promise((resolve, reject) => {
      this.socket.once('open', resolve);
      this.socket.once('error', reject);
    });
    this.socket.on('message', (raw: RawData) => {
      const parsed = JSON.parse(rawText(raw)) as unknown;
      if (isSocketFrame(parsed)) {
        this.frames.push(parsed);
        for (const listener of this.listeners) listener();
      }
    });
  }

  send(event: string, data: unknown): void {
    this.socket.send(JSON.stringify({ event, data }));
  }

  close(): void {
    this.socket.close();
  }

  wait(
    event: string,
    predicate: (data: unknown) => boolean = () => true,
  ): Promise<SocketFrame> {
    return new Promise((resolve, reject) => {
      const read = () => {
        const index = this.frames.findIndex(
          (frame) => frame.event === event && predicate(frame.data),
        );
        if (index < 0) return;
        const [frame] = this.frames.splice(index, 1);
        if (!frame) return;
        clearTimeout(timer);
        this.listeners.delete(read);
        resolve(frame);
      };
      const timer = setTimeout(() => {
        this.listeners.delete(read);
        reject(
          new Error(
            `Timed out waiting for WebSocket event ${event}; received: ${this.frames.map((frame) => frame.event).join(', ')}`,
          ),
        );
      }, 5_000);
      this.listeners.add(read);
      read();
    });
  }
}

function isSocketFrame(value: unknown): value is SocketFrame {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).event === 'string'
  );
}

function objectString(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'string' ? field : null;
}

function objectNumber(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'number' ? field : null;
}

function rawText(raw: RawData): string {
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return raw.toString('utf8');
}
