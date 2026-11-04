import { Injectable } from '@nestjs/common';
import type {
  GroupMemberRole,
  GroupMemberStatus,
  GroupVisibility,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface GroupMembershipRow {
  userId: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  joinedAt: Date | null;
}

export interface GroupRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: GroupVisibility;
  avatarKey: string | null;
  color: string;
  memberCount: number;
  viewerMembership: GroupMembershipRow | null;
}

export interface MemberRow extends GroupMembershipRow {
  username: string;
  displayName: string | null;
  avatarKey: string | null;
  level: number;
}

@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async home(
    viewerId: string | undefined,
    term: string,
    take: number,
  ): Promise<{
    yours: GroupRow[];
    discover: GroupRow[];
    invitations: GroupRow[];
  }> {
    const text =
      term === ''
        ? undefined
        : { contains: term, mode: 'insensitive' as const };
    const common = {
      ...(text ? { OR: [{ name: text }, { description: text }] } : {}),
    };
    const [yours, discover, invitations] = await Promise.all([
      viewerId
        ? this.prisma.group.findMany({
            where: {
              ...common,
              members: { some: { userId: viewerId, status: 'active' } },
            },
            orderBy: { updatedAt: 'desc' },
            take,
            include: this.summaryInclude(viewerId),
          })
        : Promise.resolve([]),
      this.prisma.group.findMany({
        where: {
          ...common,
          visibility: 'public',
          ...(viewerId
            ? { members: { none: { userId: viewerId, status: 'active' } } }
            : {}),
        },
        orderBy: [{ members: { _count: 'desc' } }, { createdAt: 'desc' }],
        take,
        include: this.summaryInclude(viewerId),
      }),
      viewerId
        ? this.prisma.group.findMany({
            where: {
              ...common,
              members: { some: { userId: viewerId, status: 'invited' } },
            },
            orderBy: { updatedAt: 'desc' },
            take,
            include: this.summaryInclude(viewerId),
          })
        : Promise.resolve([]),
    ]);
    return {
      yours: yours.map((row) => this.toGroupRow(row)),
      discover: discover.map((row) => this.toGroupRow(row)),
      invitations: invitations.map((row) => this.toGroupRow(row)),
    };
  }

  async find(idOrSlug: string, viewerId?: string): Promise<GroupRow | null> {
    const group = await this.prisma.group.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: this.summaryInclude(viewerId),
    });
    return group ? this.toGroupRow(group) : null;
  }

  async create(data: {
    slug: string;
    name: string;
    description: string;
    visibility: GroupVisibility;
    color: string;
    ownerId: string;
  }): Promise<GroupRow> {
    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          slug: data.slug,
          name: data.name,
          description: data.description,
          visibility: data.visibility,
          color: data.color,
          createdById: data.ownerId,
        },
      });
      await tx.groupMember.create({
        data: {
          groupId: created.id,
          userId: data.ownerId,
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
        },
      });
      return tx.group.findUniqueOrThrow({
        where: { id: created.id },
        include: this.summaryInclude(data.ownerId),
      });
    });
    return this.toGroupRow(group);
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      visibility?: GroupVisibility;
      color?: string;
    },
  ): Promise<void> {
    await this.prisma.group.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.group.delete({ where: { id } });
  }

  async members(
    groupId: string,
    status?: GroupMemberStatus,
  ): Promise<MemberRow[]> {
    const rows = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        ...(status ? { status } : {}),
        user: { is: { blockedAt: null, deletedAt: null } },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatarKey: true,
            level: true,
          },
        },
      },
    });
    return rows.map((row) => ({
      userId: row.userId,
      role: row.role,
      status: row.status,
      joinedAt: row.joinedAt,
      username: row.user.username,
      displayName: row.user.displayName,
      avatarKey: row.user.avatarKey,
      level: row.user.level,
    }));
  }

  membership(
    groupId: string,
    userId: string,
  ): Promise<GroupMembershipRow | null> {
    return this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { userId: true, role: true, status: true, joinedAt: true },
    });
  }

  async requestOrJoin(
    groupId: string,
    userId: string,
    status: 'active' | 'pending',
  ): Promise<void> {
    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: {
        groupId,
        userId,
        status,
        role: 'member',
        joinedAt: status === 'active' ? new Date() : null,
      },
      update: {
        status,
        role: 'member',
        invitedById: null,
        joinedAt: status === 'active' ? new Date() : null,
      },
    });
  }

  async invite(
    groupId: string,
    userId: string,
    invitedById: string,
  ): Promise<void> {
    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: {
        groupId,
        userId,
        status: 'invited',
        role: 'member',
        invitedById,
      },
      update: {
        status: 'invited',
        role: 'member',
        invitedById,
        joinedAt: null,
      },
    });
  }

  async activate(groupId: string, userId: string): Promise<void> {
    await this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { status: 'active', joinedAt: new Date(), invitedById: null },
    });
  }

  async removeMembership(groupId: string, userId: string): Promise<void> {
    await this.prisma.groupMember.deleteMany({ where: { groupId, userId } });
  }

  async setAdmin(
    groupId: string,
    userId: string,
    admin: boolean,
  ): Promise<void> {
    await this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { role: admin ? 'admin' : 'member' },
    });
  }

  async transferOwnership(
    groupId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.groupMember.update({
        where: { groupId_userId: { groupId, userId: fromUserId } },
        data: { role: 'admin' },
      }),
      this.prisma.groupMember.update({
        where: { groupId_userId: { groupId, userId: toUserId } },
        data: { role: 'owner' },
      }),
    ]);
  }

  findUser(username: string): Promise<{ id: string } | null> {
    return this.prisma.user.findFirst({
      where: {
        username: username.toLowerCase(),
        blockedAt: null,
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  countActiveAdmins(groupId: string): Promise<number> {
    return this.prisma.groupMember.count({
      where: { groupId, status: 'active', role: { in: ['owner', 'admin'] } },
    });
  }

  async searchPublic(term: string, take: number): Promise<GroupRow[]> {
    const rows = await this.prisma.group.findMany({
      where: {
        visibility: 'public',
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ members: { _count: 'desc' } }, { createdAt: 'desc' }],
      take,
      include: this.summaryInclude(undefined),
    });
    return rows.map((row) => this.toGroupRow(row));
  }

  private summaryInclude(viewerId: string | undefined) {
    return {
      _count: { select: { members: { where: { status: 'active' as const } } } },
      members: {
        where: { userId: viewerId ?? '00000000-0000-0000-0000-000000000000' },
        select: { userId: true, role: true, status: true, joinedAt: true },
        take: 1,
      },
    };
  }

  private toGroupRow(row: {
    id: string;
    slug: string;
    name: string;
    description: string;
    visibility: GroupVisibility;
    avatarKey: string | null;
    color: string;
    _count: { members: number };
    members: GroupMembershipRow[];
  }): GroupRow {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      visibility: row.visibility,
      avatarKey: row.avatarKey,
      color: row.color,
      memberCount: row._count.members,
      viewerMembership: row.members[0] ?? null,
    };
  }
}
