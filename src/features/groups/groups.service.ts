import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { StorageService } from '../../lib/storage/storage.service.js';
import { StorageUnavailableError } from '../../lib/storage/storage.errors.js';
import type {
  CreateGroupDto,
  UpdateGroupDto,
} from './dto/groups.request.dto.js';
import type {
  GroupActionDto,
  GroupDetailsDto,
  GroupMemberDto,
  GroupsHomeDto,
  GroupSummaryDto,
} from './dto/groups.response.dto.js';
import {
  GROUP_LARGE_MEMBER_THRESHOLD,
  GROUP_LARGE_MIN_ADMINS,
  GROUP_LIST_LIMIT,
} from './groups.constants.js';
import {
  GroupAdminRequiredError,
  GroupAlreadyMemberError,
  GroupCannotInviteError,
  GroupInvitationRequiredError,
  GroupMemberNotFoundError,
  GroupMembershipRequiredError,
  GroupNeedsSecondAdminError,
  GroupNotFoundError,
  GroupOwnerProtectedError,
  GroupOwnerRequiredError,
  GroupRequestPendingError,
} from './groups.errors.js';
import {
  type GroupMembershipRow,
  type GroupRow,
  type MemberRow,
  GroupsRepository,
} from './groups.repository.js';

@Injectable()
export class GroupsService {
  constructor(
    private readonly repository: GroupsRepository,
    private readonly storage: StorageService,
  ) {}

  async home(
    viewerId: string | undefined,
    query: { q?: string; limit?: number },
  ): Promise<GroupsHomeDto> {
    const rows = await this.repository.home(
      viewerId,
      query.q?.trim() ?? '',
      query.limit ?? GROUP_LIST_LIMIT,
    );
    return {
      yours: rows.yours.map((row) => this.summary(row)),
      discover: rows.discover.map((row) => this.summary(row)),
      invitations: rows.invitations.map((row) => this.summary(row)),
    };
  }

  async details(idOrSlug: string, viewerId?: string): Promise<GroupDetailsDto> {
    const group = await this.group(idOrSlug, viewerId);
    if (group.visibility === 'private' && !group.viewerMembership) {
      throw new GroupNotFoundError();
    }
    const active = await this.repository.members(group.id, 'active');
    const canModerate = this.isAdmin(group.viewerMembership);
    const pending = canModerate
      ? await this.repository.members(group.id, 'pending')
      : [];
    return {
      ...this.summary(group),
      members: active.map((row) => this.member(row)),
      pendingRequests: pending.map((row) => this.member(row)),
    };
  }

  async create(ownerId: string, dto: CreateGroupDto): Promise<GroupDetailsDto> {
    const group = await this.repository.create({
      slug: this.slug(dto.name),
      name: dto.name.trim(),
      description: dto.description.trim(),
      visibility: dto.visibility,
      color: dto.color?.toUpperCase() ?? '#0C807A',
      ownerId,
    });
    return this.details(group.id, ownerId);
  }

  async update(
    actorId: string,
    id: string,
    dto: UpdateGroupDto,
  ): Promise<GroupDetailsDto> {
    const group = await this.group(id, actorId);
    this.requireAdmin(group.viewerMembership);
    await this.repository.update(group.id, {
      ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
      ...(dto.description === undefined
        ? {}
        : { description: dto.description.trim() }),
      ...(dto.visibility === undefined ? {} : { visibility: dto.visibility }),
      ...(dto.color === undefined ? {} : { color: dto.color.toUpperCase() }),
    });
    return this.details(group.id, actorId);
  }

  async delete(actorId: string, id: string): Promise<GroupActionDto> {
    const group = await this.group(id, actorId);
    this.requireOwner(group.viewerMembership);
    await this.repository.delete(group.id);
    return { status: 'deleted' };
  }

  async join(userId: string, id: string): Promise<GroupActionDto> {
    const group = await this.group(id, userId);
    const membership = group.viewerMembership;
    if (membership?.status === 'active') throw new GroupAlreadyMemberError();
    if (membership?.status === 'pending') throw new GroupRequestPendingError();
    const status =
      group.visibility === 'public' || membership?.status === 'invited'
        ? 'active'
        : 'pending';
    await this.repository.requestOrJoin(group.id, userId, status);
    return { status: status === 'active' ? 'joined' : 'pending' };
  }

  async leave(userId: string, id: string): Promise<GroupActionDto> {
    const group = await this.group(id, userId);
    const membership = this.requireMember(group.viewerMembership);
    if (membership.role === 'owner') throw new GroupOwnerProtectedError();
    await this.guardLargeGroupAdmins(group, membership);
    await this.repository.removeMembership(group.id, userId);
    return { status: 'left' };
  }

  async invite(
    actorId: string,
    id: string,
    username: string,
  ): Promise<GroupActionDto> {
    const group = await this.group(id, actorId);
    this.requireAdmin(group.viewerMembership);
    const target = await this.repository.findUser(username.trim());
    if (!target || target.id === actorId) throw new GroupCannotInviteError();
    const existing = await this.repository.membership(group.id, target.id);
    if (existing?.status === 'active' || existing?.status === 'pending') {
      throw new GroupCannotInviteError();
    }
    await this.repository.invite(group.id, target.id, actorId);
    return { status: 'invited' };
  }

  async acceptInvite(userId: string, id: string): Promise<GroupActionDto> {
    const group = await this.group(id, userId);
    if (group.viewerMembership?.status !== 'invited')
      throw new GroupInvitationRequiredError();
    await this.repository.activate(group.id, userId);
    return { status: 'joined' };
  }

  async declineInvite(userId: string, id: string): Promise<GroupActionDto> {
    const group = await this.group(id, userId);
    if (group.viewerMembership?.status !== 'invited')
      throw new GroupInvitationRequiredError();
    await this.repository.removeMembership(group.id, userId);
    return { status: 'declined' };
  }

  async approve(
    actorId: string,
    id: string,
    userId: string,
  ): Promise<GroupActionDto> {
    const group = await this.group(id, actorId);
    this.requireAdmin(group.viewerMembership);
    const target = await this.repository.membership(group.id, userId);
    if (target?.status !== 'pending') throw new GroupMemberNotFoundError();
    await this.repository.activate(group.id, userId);
    return { status: 'approved' };
  }

  async reject(
    actorId: string,
    id: string,
    userId: string,
  ): Promise<GroupActionDto> {
    const group = await this.group(id, actorId);
    this.requireAdmin(group.viewerMembership);
    const target = await this.repository.membership(group.id, userId);
    if (target?.status !== 'pending') throw new GroupMemberNotFoundError();
    await this.repository.removeMembership(group.id, userId);
    return { status: 'rejected' };
  }

  async setAdmin(
    actorId: string,
    id: string,
    userId: string,
    admin: boolean,
  ): Promise<GroupActionDto> {
    const group = await this.group(id, actorId);
    this.requireOwner(group.viewerMembership);
    const target = await this.repository.membership(group.id, userId);
    if (target?.status !== 'active') throw new GroupMemberNotFoundError();
    if (target.role === 'owner') throw new GroupOwnerProtectedError();
    if (!admin) await this.guardLargeGroupAdmins(group, target);
    await this.repository.setAdmin(group.id, userId, admin);
    return { status: admin ? 'promoted' : 'demoted' };
  }

  async remove(
    actorId: string,
    id: string,
    userId: string,
  ): Promise<GroupActionDto> {
    const group = await this.group(id, actorId);
    const actor = this.requireAdmin(group.viewerMembership);
    const target = await this.repository.membership(group.id, userId);
    if (target?.status !== 'active') throw new GroupMemberNotFoundError();
    if (
      target.role === 'owner' ||
      (target.role === 'admin' && actor.role !== 'owner')
    ) {
      throw new GroupOwnerProtectedError();
    }
    await this.guardLargeGroupAdmins(group, target);
    await this.repository.removeMembership(group.id, userId);
    return { status: 'removed' };
  }

  async transfer(
    actorId: string,
    id: string,
    userId: string,
  ): Promise<GroupActionDto> {
    const group = await this.group(id, actorId);
    this.requireOwner(group.viewerMembership);
    const target = await this.repository.membership(group.id, userId);
    if (target?.status !== 'active' || target.role === 'owner')
      throw new GroupMemberNotFoundError();
    await this.repository.transferOwnership(group.id, actorId, userId);
    return { status: 'transferred' };
  }

  async searchPublic(term: string, take: number): Promise<GroupSummaryDto[]> {
    return (await this.repository.searchPublic(term, take)).map((row) =>
      this.summary(row),
    );
  }

  async activeMembership(
    idOrSlug: string,
    userId: string,
  ): Promise<{ role: 'owner' | 'admin' | 'member' }> {
    const group = await this.group(idOrSlug, userId);
    const membership = this.requireMember(group.viewerMembership);
    return { role: membership.role };
  }

  private async group(idOrSlug: string, viewerId?: string): Promise<GroupRow> {
    const group = await this.repository.find(idOrSlug, viewerId);
    if (!group) throw new GroupNotFoundError();
    return group;
  }

  private requireMember(
    membership: GroupMembershipRow | null,
  ): GroupMembershipRow {
    if (membership?.status !== 'active')
      throw new GroupMembershipRequiredError();
    return membership;
  }

  private requireAdmin(
    membership: GroupMembershipRow | null,
  ): GroupMembershipRow {
    const member = this.requireMember(membership);
    if (member.role === 'member') throw new GroupAdminRequiredError();
    return member;
  }

  private requireOwner(
    membership: GroupMembershipRow | null,
  ): GroupMembershipRow {
    const member = this.requireMember(membership);
    if (member.role !== 'owner') throw new GroupOwnerRequiredError();
    return member;
  }

  private isAdmin(membership: GroupMembershipRow | null): boolean {
    return membership?.status === 'active' && membership.role !== 'member';
  }

  private async guardLargeGroupAdmins(
    group: GroupRow,
    member: GroupMembershipRow,
  ): Promise<void> {
    if (
      group.visibility !== 'public' ||
      group.memberCount <= GROUP_LARGE_MEMBER_THRESHOLD ||
      member.role === 'member'
    )
      return;
    const admins = await this.repository.countActiveAdmins(group.id);
    if (admins <= GROUP_LARGE_MIN_ADMINS)
      throw new GroupNeedsSecondAdminError();
  }

  private summary(row: GroupRow): GroupSummaryDto {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      visibility: row.visibility,
      avatarUrl: this.publicUrl(row.avatarKey),
      color: row.color,
      memberCount: row.memberCount,
      unreadCount: row.unreadCount,
      viewerMembership: row.viewerMembership
        ? {
            status: row.viewerMembership.status,
            role: row.viewerMembership.role,
            joinedAt: row.viewerMembership.joinedAt?.toISOString() ?? null,
            notificationsMuted: row.viewerMembership.notificationsMuted,
          }
        : null,
    };
  }

  private member(row: MemberRow): GroupMemberDto {
    return {
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: this.publicUrl(row.avatarKey),
      level: row.level,
      verifiedLeader: row.level >= 5,
      role: row.role,
      status: row.status,
      joinedAt: row.joinedAt?.toISOString() ?? null,
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

  private slug(name: string): string {
    const base =
      name
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
        .slice(0, 88) || 'group';
    return `${base}-${randomBytes(4).toString('hex')}`;
  }
}
