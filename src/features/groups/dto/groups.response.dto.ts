import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GROUP_MEMBER_ROLES,
  GROUP_MEMBER_STATUSES,
  GROUP_VISIBILITIES,
  type GroupMemberRoleCode,
  type GroupMemberStatusCode,
  type GroupVisibilityCode,
} from '../groups.constants.js';

export class GroupViewerMembershipDto {
  @ApiProperty({ enum: GROUP_MEMBER_STATUSES }) status: GroupMemberStatusCode;
  @ApiProperty({ enum: GROUP_MEMBER_ROLES }) role: GroupMemberRoleCode;
  @ApiProperty({ type: String, nullable: true }) joinedAt: string | null;
}

export class GroupSummaryDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty({ enum: GROUP_VISIBILITIES }) visibility: GroupVisibilityCode;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
  @ApiProperty() color: string;
  @ApiProperty({ type: 'integer' }) memberCount: number;
  @ApiProperty({ type: GroupViewerMembershipDto, nullable: true })
  viewerMembership: GroupViewerMembershipDto | null;
}

export class GroupsHomeDto {
  @ApiProperty({ type: [GroupSummaryDto] }) yours: GroupSummaryDto[];
  @ApiProperty({ type: [GroupSummaryDto] }) discover: GroupSummaryDto[];
  @ApiProperty({ type: [GroupSummaryDto] }) invitations: GroupSummaryDto[];
}

export class GroupMemberDto {
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty() username: string;
  @ApiProperty({ type: String, nullable: true }) displayName: string | null;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
  @ApiProperty({ type: 'integer' }) level: number;
  @ApiProperty() verifiedLeader: boolean;
  @ApiProperty({ enum: GROUP_MEMBER_ROLES }) role: GroupMemberRoleCode;
  @ApiProperty({ enum: GROUP_MEMBER_STATUSES }) status: GroupMemberStatusCode;
  @ApiPropertyOptional({ type: String, nullable: true }) joinedAt:
    string | null;
}

export class GroupDetailsDto extends GroupSummaryDto {
  @ApiProperty({ type: [GroupMemberDto] }) members: GroupMemberDto[];
  @ApiProperty({ type: [GroupMemberDto] }) pendingRequests: GroupMemberDto[];
}

export class GroupActionDto {
  @ApiProperty() status: string;
}
