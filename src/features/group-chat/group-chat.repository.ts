import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const messageInclude = {
  sender: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarKey: true,
      level: true,
    },
  },
  replyTo: {
    select: {
      id: true,
      body: true,
      deletedAt: true,
      sender: { select: { username: true } },
    },
  },
  attachments: {
    orderBy: { order: 'asc' as const },
    include: {
      place: { select: { id: true, nameUz: true, nameRu: true, nameEn: true } },
    },
  },
  reactions: { select: { emoji: true, userId: true } },
  mentions: { select: { userId: true } },
} satisfies Prisma.GroupMessageInclude;

export type GroupMessageRow = Prisma.GroupMessageGetPayload<{
  include: typeof messageInclude;
}>;

export interface MessageCursor {
  createdAt: Date;
  id: string;
}

@Injectable()
export class GroupChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isActiveUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, blockedAt: null, deletedAt: null },
      select: { id: true },
    });
    return user !== null;
  }

  list(
    groupId: string,
    cursor: MessageCursor | undefined,
    take: number,
  ): Promise<GroupMessageRow[]> {
    return this.prisma.groupMessage.findMany({
      where: {
        groupId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      include: messageInclude,
    });
  }

  find(messageId: string): Promise<GroupMessageRow | null> {
    return this.prisma.groupMessage.findUnique({
      where: { id: messageId },
      include: messageInclude,
    });
  }

  async readers(
    groupId: string,
  ): Promise<{ userId: string; lastReadAt: Date | null }[]> {
    return this.prisma.groupMember.findMany({
      where: { groupId, status: 'active' },
      select: { userId: true, lastReadAt: true },
    });
  }

  async validPlaces(placeIds: string[]): Promise<Set<string>> {
    if (!placeIds.length) return new Set();
    const rows = await this.prisma.place.findMany({
      where: { id: { in: placeIds } },
      select: { id: true },
    });
    return new Set(rows.map((row) => row.id));
  }

  async create(data: {
    groupId: string;
    senderId: string;
    body: string | null;
    replyToId: string | null;
    attachments: {
      type: 'photo' | 'place';
      imageKey?: string;
      placeId?: string;
      order: number;
    }[];
  }): Promise<GroupMessageRow> {
    return this.prisma.$transaction(async (tx) => {
      const mentionUsers = await this.mentionedMembers(
        tx,
        data.groupId,
        data.body ?? '',
        data.senderId,
      );
      const message = await tx.groupMessage.create({
        data: {
          groupId: data.groupId,
          senderId: data.senderId,
          body: data.body,
          replyToId: data.replyToId,
          attachments: { create: data.attachments },
          mentions: {
            create: mentionUsers.map((user) => ({ userId: user.id })),
          },
        },
        include: messageInclude,
      });
      if (mentionUsers.length) {
        const group = await tx.group.findUniqueOrThrow({
          where: { id: data.groupId },
          select: { name: true },
        });
        const sender = await tx.user.findUniqueOrThrow({
          where: { id: data.senderId },
          select: { username: true, displayName: true },
        });
        const who = sender.displayName ?? `@${sender.username}`;
        await tx.notification.createMany({
          data: mentionUsers.map((user) => ({
            userId: user.id,
            category: 'social' as const,
            kind: 'group_mention',
            title: {
              uz: `${who} sizni ${group.name} guruhida tilga oldi`,
              ru: `${who} упомянул(а) вас в ${group.name}`,
              en: `${who} mentioned you in ${group.name}`,
            },
            ...(data.body ? { body: data.body } : {}),
            data: { groupId: data.groupId, messageId: message.id },
          })),
        });
      }
      return message;
    });
  }

  async edit(
    messageId: string,
    groupId: string,
    senderId: string,
    body: string,
  ): Promise<GroupMessageRow> {
    return this.prisma.$transaction(async (tx) => {
      const mentions = await this.mentionedMembers(tx, groupId, body, senderId);
      await tx.groupMessageMention.deleteMany({ where: { messageId } });
      return tx.groupMessage.update({
        where: { id: messageId },
        data: {
          body,
          editedAt: new Date(),
          mentions: { create: mentions.map((user) => ({ userId: user.id })) },
        },
        include: messageInclude,
      });
    });
  }

  async delete(messageId: string): Promise<GroupMessageRow> {
    return this.prisma.groupMessage.update({
      where: { id: messageId },
      data: {
        body: null,
        deletedAt: new Date(),
        attachments: { deleteMany: {} },
        mentions: { deleteMany: {} },
      },
      include: messageInclude,
    });
  }

  async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    await this.prisma.groupMessageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
  }

  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    await this.prisma.groupMessageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
  }

  async markRead(groupId: string, userId: string, at: Date): Promise<void> {
    await this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { lastReadAt: at },
    });
  }

  async mute(groupId: string, userId: string, muted: boolean): Promise<void> {
    await this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { notificationsMuted: muted },
    });
  }

  private async mentionedMembers(
    tx: Prisma.TransactionClient,
    groupId: string,
    body: string,
    senderId: string,
  ): Promise<{ id: string }[]> {
    const usernames = [...body.matchAll(/(?:^|\s)@([a-z0-9_]{3,20})\b/gi)]
      .map((match) => match[1]?.toLowerCase())
      .filter((value): value is string => Boolean(value));
    if (!usernames.length) return [];
    return tx.user.findMany({
      where: {
        id: { not: senderId },
        username: { in: [...new Set(usernames)] },
        notifyGroups: true,
        groupMemberships: {
          some: { groupId, status: 'active', notificationsMuted: false },
        },
      },
      select: { id: true },
    });
  }
}
