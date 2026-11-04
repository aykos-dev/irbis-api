import { Injectable } from '@nestjs/common';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import { StorageService } from '../../lib/storage/storage.service.js';
import { StorageUnavailableError } from '../../lib/storage/storage.errors.js';
import { GroupsService } from '../groups/groups.service.js';
import type {
  CreateGroupMessageDto,
  GroupMessageAttachmentDto,
  GroupMessagesQueryDto,
} from './dto/group-chat.request.dto.js';
import type {
  GroupChatActionDto,
  GroupMessageDto,
  GroupMessagesPageDto,
  GroupTripCardDto,
} from './dto/group-chat.response.dto.js';
import { GROUP_MESSAGE_PAGE_DEFAULT } from './group-chat.constants.js';
import {
  GroupAttachmentInvalidError,
  GroupMessageDeleteForbiddenError,
  GroupMessageEditForbiddenError,
  GroupMessageEmptyError,
  GroupMessageNotFoundError,
} from './group-chat.errors.js';
import { GroupChatEvents } from './group-chat.events.js';
import {
  type GroupMessageRow,
  type MessageCursor,
  GroupChatRepository,
} from './group-chat.repository.js';

@Injectable()
export class GroupChatService {
  constructor(
    private readonly repository: GroupChatRepository,
    private readonly groups: GroupsService,
    private readonly storage: StorageService,
    private readonly events: GroupChatEvents,
  ) {}

  async ensureMember(userId: string, groupId: string): Promise<void> {
    await this.activeMembership(groupId, userId);
  }

  async list(
    userId: string,
    groupId: string,
    query: GroupMessagesQueryDto,
  ): Promise<GroupMessagesPageDto> {
    await this.activeMembership(groupId, userId);
    const cursor = this.cursor(query.cursor);
    const limit = query.limit ?? GROUP_MESSAGE_PAGE_DEFAULT;
    const [rows, readers] = await Promise.all([
      this.repository.list(groupId, cursor, limit + 1),
      this.repository.readers(groupId),
    ]);
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.reverse().map((row) => this.message(row, userId, readers)),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }

  async send(
    userId: string,
    groupId: string,
    dto: CreateGroupMessageDto,
  ): Promise<GroupMessageDto> {
    await this.activeMembership(groupId, userId);
    const body = dto.body?.trim() || null;
    const attachments = dto.attachments ?? [];
    if (!body && !attachments.length) throw new GroupMessageEmptyError();
    await this.validateAttachments(userId, attachments);
    if (dto.replyToId) {
      const reply = await this.repository.find(dto.replyToId);
      if (!reply || reply.groupId !== groupId)
        throw new GroupMessageNotFoundError();
    }
    const row = await this.repository.create({
      groupId,
      senderId: userId,
      body,
      replyToId: dto.replyToId ?? null,
      attachments: attachments.map((item, order) => ({
        type: item.type,
        ...(item.imageKey ? { imageKey: item.imageKey } : {}),
        ...(item.placeId ? { placeId: item.placeId } : {}),
        order,
      })),
    });
    await this.repository.markRead(groupId, userId, new Date());
    const message = this.message(row, userId, [
      { userId, lastReadAt: new Date() },
    ]);
    this.events.emit({ type: 'message.created', groupId, message });
    return message;
  }

  async edit(
    userId: string,
    groupId: string,
    messageId: string,
    bodyRaw: string,
  ): Promise<GroupMessageDto> {
    await this.activeMembership(groupId, userId);
    const row = await this.ownedMessage(groupId, messageId);
    if (row.senderId !== userId || row.deletedAt)
      throw new GroupMessageEditForbiddenError();
    const body = bodyRaw.trim();
    if (!body) throw new GroupMessageEmptyError();
    const updated = await this.repository.edit(
      messageId,
      groupId,
      userId,
      body,
    );
    const message = this.message(
      updated,
      userId,
      await this.repository.readers(groupId),
    );
    this.events.emit({ type: 'message.updated', groupId, message });
    return message;
  }

  async delete(
    userId: string,
    groupId: string,
    messageId: string,
  ): Promise<GroupMessageDto> {
    const membership = await this.activeMembership(groupId, userId);
    const row = await this.ownedMessage(groupId, messageId);
    if (row.senderId !== userId && membership.role === 'member') {
      throw new GroupMessageDeleteForbiddenError();
    }
    const deleted = row.deletedAt
      ? row
      : await this.repository.delete(messageId);
    const message = this.message(
      deleted,
      userId,
      await this.repository.readers(groupId),
    );
    this.events.emit({ type: 'message.deleted', groupId, message });
    return message;
  }

  async react(
    userId: string,
    groupId: string,
    messageId: string,
    emojiRaw: string,
    add: boolean,
  ): Promise<GroupChatActionDto> {
    await this.activeMembership(groupId, userId);
    await this.ownedMessage(groupId, messageId);
    const emoji = emojiRaw.trim();
    if (!emoji) throw new RequestValidationError({ emoji: ['required'] });
    if (add) await this.repository.addReaction(messageId, userId, emoji);
    else await this.repository.removeReaction(messageId, userId, emoji);
    this.events.emit({ type: 'reaction.changed', groupId, messageId, userId });
    return { status: add ? 'added' : 'removed' };
  }

  async read(
    userId: string,
    groupId: string,
    messageId: string,
  ): Promise<GroupChatActionDto> {
    await this.activeMembership(groupId, userId);
    const message = await this.ownedMessage(groupId, messageId);
    await this.repository.markRead(groupId, userId, message.createdAt);
    this.events.emit({ type: 'read.changed', groupId, messageId, userId });
    return { status: 'read' };
  }

  async mute(
    userId: string,
    groupId: string,
    muted: boolean,
  ): Promise<GroupChatActionDto> {
    await this.activeMembership(groupId, userId);
    await this.repository.mute(groupId, userId, muted);
    return { status: muted ? 'muted' : 'unmuted' };
  }

  private async activeMembership(groupId: string, userId: string) {
    return this.groups.activeMembership(groupId, userId);
  }

  private async ownedMessage(
    groupId: string,
    messageId: string,
  ): Promise<GroupMessageRow> {
    const message = await this.repository.find(messageId);
    if (!message || message.groupId !== groupId)
      throw new GroupMessageNotFoundError();
    return message;
  }

  private async validateAttachments(
    userId: string,
    items: GroupMessageAttachmentDto[],
  ): Promise<void> {
    const placeIds = items.flatMap((item) =>
      item.type === 'place' && item.placeId ? [item.placeId] : [],
    );
    const validPlaces = await this.repository.validPlaces(placeIds);
    for (const item of items) {
      const photo =
        item.type === 'photo' &&
        item.imageKey?.startsWith(`group-chat/${userId}/`) &&
        !item.placeId;
      const place =
        item.type === 'place' &&
        !!item.placeId &&
        validPlaces.has(item.placeId) &&
        !item.imageKey;
      if (!photo && !place) throw new GroupAttachmentInvalidError();
    }
  }

  private message(
    row: GroupMessageRow,
    viewerId: string,
    readers: { userId: string; lastReadAt: Date | null }[],
  ): GroupMessageDto {
    const reactions = new Map<string, { count: number; mine: boolean }>();
    for (const reaction of row.reactions) {
      const aggregate = reactions.get(reaction.emoji) ?? {
        count: 0,
        mine: false,
      };
      aggregate.count += 1;
      aggregate.mine ||= reaction.userId === viewerId;
      reactions.set(reaction.emoji, aggregate);
    }
    return {
      id: row.id,
      groupId: row.groupId,
      kind: row.kind,
      author: row.sender
        ? {
            id: row.sender.id,
            username: row.sender.username,
            displayName: row.sender.displayName,
            avatarUrl: this.publicUrl(row.sender.avatarKey),
            level: row.sender.level,
            verifiedLeader: row.sender.level >= 5,
          }
        : null,
      body: row.deletedAt ? null : row.body,
      replyTo: row.replyTo
        ? {
            id: row.replyTo.id,
            body: row.replyTo.deletedAt ? null : row.replyTo.body,
            username: row.replyTo.sender?.username ?? null,
          }
        : null,
      attachments: row.deletedAt
        ? []
        : row.attachments.map((item) => ({
            type: item.type,
            imageUrl: this.publicUrl(item.imageKey),
            placeId: item.place?.id ?? null,
            placeName: item.place
              ? (item.place.nameEn ?? item.place.nameRu ?? item.place.nameUz)
              : null,
          })),
      reactions: [...reactions].map(([emoji, value]) => ({ emoji, ...value })),
      mentionedUserIds: row.mentions.map((mention) => mention.userId),
      readByCount: readers.filter(
        (reader) =>
          reader.userId !== row.senderId &&
          reader.lastReadAt !== null &&
          reader.lastReadAt >= row.createdAt,
      ).length,
      trip: this.trip(row.tripData),
      editedAt: row.editedAt?.toISOString() ?? null,
      deletedAt: row.deletedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private trip(value: unknown): GroupTripCardDto | null {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return null;
    const v = value as Record<string, unknown>;
    if (
      typeof v.title !== 'string' ||
      typeof v.startsAt !== 'string' ||
      typeof v.meetingTime !== 'string' ||
      typeof v.difficulty !== 'number' ||
      typeof v.requiredLevel !== 'number' ||
      typeof v.capacity !== 'number' ||
      typeof v.joined !== 'number' ||
      typeof v.condition !== 'string'
    )
      return null;
    return {
      title: v.title,
      startsAt: v.startsAt,
      meetingTime: v.meetingTime,
      difficulty: v.difficulty,
      requiredLevel: v.requiredLevel,
      capacity: v.capacity,
      joined: v.joined,
      condition: v.condition,
      imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl : null,
    };
  }

  private publicUrl(key: string | null): string | null {
    if (!key) return null;
    try {
      return this.storage.publicUrl(key);
    } catch (error) {
      if (error instanceof StorageUnavailableError) return null;
      throw error;
    }
  }

  private cursor(raw: string | undefined): MessageCursor | undefined {
    if (!raw) return undefined;
    const payload = decodeCursor(raw);
    const createdAt =
      typeof payload?.createdAt === 'string'
        ? new Date(payload.createdAt)
        : null;
    const id = typeof payload?.id === 'string' ? payload.id : null;
    if (!createdAt || Number.isNaN(createdAt.getTime()) || !id) {
      throw new RequestValidationError({ cursor: ['invalid'] });
    }
    return { createdAt, id };
  }
}
