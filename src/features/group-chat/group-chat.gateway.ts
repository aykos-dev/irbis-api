import { type OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { IsBoolean, IsString, IsUUID, MinLength } from 'class-validator';
import type { Subscription } from 'rxjs';
import type { WebSocket } from 'ws';
import { AppConfig } from '../../config/app-config.js';
import { GroupChatEvents, type GroupChatEvent } from './group-chat.events.js';
import { GroupChatRepository } from './group-chat.repository.js';
import { GroupChatService } from './group-chat.service.js';

class AuthFrame {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsUUID()
  groupId!: string;
}

class TypingFrame {
  @IsUUID()
  groupId!: string;

  @IsBoolean()
  typing!: boolean;
}

interface AccessPayload {
  sub?: unknown;
}

interface SocketSession {
  userId: string;
  groupId: string;
  typing: boolean;
}

interface SocketEnvelope {
  event: string;
  data: unknown;
}

@WebSocketGateway({ path: '/v1/groups/chat' })
export class GroupChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly sessions = new Map<WebSocket, SocketSession>();
  private readonly rooms = new Map<string, Set<WebSocket>>();
  private readonly eventSubscription: Subscription;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly chat: GroupChatService,
    private readonly repository: GroupChatRepository,
    events: GroupChatEvents,
  ) {
    this.eventSubscription = events.stream.subscribe((event) => this.broadcastEvent(event));
  }

  handleConnection(client: WebSocket): void {
    this.send(client, 'auth.required', {});
  }

  handleDisconnect(client: WebSocket): void {
    this.leave(client);
  }

  onModuleDestroy(): void {
    this.eventSubscription.unsubscribe();
  }

  @SubscribeMessage('auth')
  async authenticate(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() frame: AuthFrame,
  ): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(frame.token, {
        secret: this.config.jwtAccessSecret,
        algorithms: ['HS256'],
      });
      if (typeof payload.sub !== 'string' || !(await this.repository.isActiveUser(payload.sub))) {
        this.reject(client, 'AUTH_INVALID');
        return;
      }
      await this.chat.ensureMember(payload.sub, frame.groupId);
      this.leave(client);
      const session: SocketSession = { userId: payload.sub, groupId: frame.groupId, typing: false };
      this.sessions.set(client, session);
      const room = this.rooms.get(frame.groupId) ?? new Set<WebSocket>();
      room.add(client);
      this.rooms.set(frame.groupId, room);
      this.send(client, 'auth.ok', { groupId: frame.groupId });
      this.broadcastPresence(frame.groupId);
    } catch {
      this.reject(client, 'AUTH_INVALID');
    }
  }

  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() frame: TypingFrame,
  ): void {
    const session = this.sessions.get(client);
    if (!session || frame.groupId !== session.groupId) {
      this.send(client, 'error', { code: 'AUTH_REQUIRED' });
      return;
    }
    session.typing = frame.typing;
    this.broadcast(session.groupId, 'typing', {
      userId: session.userId,
      typing: session.typing,
    });
  }

  private broadcastEvent(event: GroupChatEvent): void {
    switch (event.type) {
      case 'message.created':
      case 'message.updated':
      case 'message.deleted':
        this.broadcast(event.groupId, event.type, { message: event.message });
        return;
      case 'reaction.changed':
      case 'read.changed':
        this.broadcast(event.groupId, event.type, {
          messageId: event.messageId,
          userId: event.userId,
        });
        return;
      case 'typing.changed':
        this.broadcast(event.groupId, 'typing', {
          userId: event.userId,
          typing: event.typing,
        });
    }
  }

  private leave(client: WebSocket): void {
    const session = this.sessions.get(client);
    if (!session) return;
    this.sessions.delete(client);
    const room = this.rooms.get(session.groupId);
    room?.delete(client);
    if (!room?.size) this.rooms.delete(session.groupId);
    if (session.typing) {
      this.broadcast(session.groupId, 'typing', { userId: session.userId, typing: false });
    }
    this.broadcastPresence(session.groupId);
  }

  private broadcastPresence(groupId: string): void {
    const users = new Set(
      [...(this.rooms.get(groupId) ?? [])]
        .map((client) => this.sessions.get(client)?.userId)
        .filter((userId): userId is string => Boolean(userId)),
    );
    this.broadcast(groupId, 'presence', { onlineCount: users.size });
  }

  private broadcast(groupId: string, event: string, data: unknown): void {
    for (const client of this.rooms.get(groupId) ?? []) this.send(client, event, data);
  }

  private send(client: WebSocket, event: string, data: unknown): void {
    if (client.readyState !== client.OPEN) return;
    const envelope: SocketEnvelope = { event, data };
    client.send(JSON.stringify(envelope));
  }

  private reject(client: WebSocket, code: string): void {
    if (client.readyState !== client.OPEN) return;
    this.send(client, 'error', { code });
    client.close(1008, code);
  }
}
