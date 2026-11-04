import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import {
  CurrentUser,
  OptionalUser,
} from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttled } from '../../common/decorators/throttle.decorator.js';
import {
  CreateGroupDto,
  GroupsListQueryDto,
  InviteGroupMemberDto,
  SetGroupAdminDto,
  UpdateGroupDto,
} from './dto/groups.request.dto.js';
import {
  GroupActionDto,
  GroupDetailsDto,
  GroupsHomeDto,
} from './dto/groups.response.dto.js';
import { GroupsService } from './groups.service.js';

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Public()
  @Throttled('lookup')
  @Get()
  @ApiOperation({
    operationId: 'Groups_list',
    summary: 'Your groups, invitations and public groups',
  })
  @ApiOkResponse({ type: GroupsHomeDto })
  list(
    @Query() query: GroupsListQueryDto,
    @OptionalUser() user?: AuthUser,
  ): Promise<GroupsHomeDto> {
    return this.groups.home(user?.id, query);
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    operationId: 'Groups_create',
    summary: 'Create a public or private group',
  })
  @ApiCreatedResponse({ type: GroupDetailsDto })
  @ApiErrorResponses({ 400: ['VALIDATION_FAILED'], 401: ['UNAUTHENTICATED'] })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGroupDto,
  ): Promise<GroupDetailsDto> {
    return this.groups.create(user.id, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    operationId: 'Groups_get',
    summary: 'Group details and visible membership state',
  })
  @ApiOkResponse({ type: GroupDetailsDto })
  @ApiErrorResponses({ 404: ['GROUP_NOT_FOUND'] })
  get(
    @Param('id') id: string,
    @OptionalUser() user?: AuthUser,
  ): Promise<GroupDetailsDto> {
    return this.groups.details(id, user?.id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    operationId: 'Groups_update',
    summary: 'Edit a group as its owner or admin',
  })
  @ApiOkResponse({ type: GroupDetailsDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ): Promise<GroupDetailsDto> {
    return this.groups.update(user.id, id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    operationId: 'Groups_delete',
    summary: 'Delete a group as its owner',
  })
  @ApiOkResponse({ type: GroupActionDto })
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GroupActionDto> {
    return this.groups.delete(user.id, id);
  }

  @ApiBearerAuth()
  @Post(':id/join')
  @ApiOperation({
    operationId: 'Groups_join',
    summary: 'Join a public group or request private membership',
  })
  @ApiOkResponse({ type: GroupActionDto })
  join(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GroupActionDto> {
    return this.groups.join(user.id, id);
  }

  @ApiBearerAuth()
  @Post(':id/leave')
  @ApiOperation({
    operationId: 'Groups_leave',
    summary: 'Leave a group after transferring ownership if needed',
  })
  @ApiOkResponse({ type: GroupActionDto })
  leave(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GroupActionDto> {
    return this.groups.leave(user.id, id);
  }

  @ApiBearerAuth()
  @Post(':id/invitations')
  @ApiOperation({
    operationId: 'Groups_invite',
    summary: 'Invite an explorer as a group admin',
  })
  @ApiOkResponse({ type: GroupActionDto })
  invite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: InviteGroupMemberDto,
  ): Promise<GroupActionDto> {
    return this.groups.invite(user.id, id, dto.username);
  }

  @ApiBearerAuth()
  @Post(':id/invitations/accept')
  @ApiOperation({
    operationId: 'Groups_acceptInvitation',
    summary: 'Accept your group invitation',
  })
  @ApiOkResponse({ type: GroupActionDto })
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GroupActionDto> {
    return this.groups.acceptInvite(user.id, id);
  }

  @ApiBearerAuth()
  @Post(':id/invitations/decline')
  @ApiOperation({
    operationId: 'Groups_declineInvitation',
    summary: 'Decline your group invitation',
  })
  @ApiOkResponse({ type: GroupActionDto })
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GroupActionDto> {
    return this.groups.declineInvite(user.id, id);
  }

  @ApiBearerAuth()
  @Post(':id/requests/:userId/approve')
  @ApiOperation({
    operationId: 'Groups_approveRequest',
    summary: 'Approve a private-group join request',
  })
  @ApiOkResponse({ type: GroupActionDto })
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<GroupActionDto> {
    return this.groups.approve(user.id, id, userId);
  }

  @ApiBearerAuth()
  @Post(':id/requests/:userId/reject')
  @ApiOperation({
    operationId: 'Groups_rejectRequest',
    summary: 'Reject a private-group join request',
  })
  @ApiOkResponse({ type: GroupActionDto })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<GroupActionDto> {
    return this.groups.reject(user.id, id, userId);
  }

  @ApiBearerAuth()
  @Patch(':id/members/:userId/admin')
  @ApiOperation({
    operationId: 'Groups_setAdmin',
    summary: 'Promote or demote an admin as owner',
  })
  @ApiOkResponse({ type: GroupActionDto })
  setAdmin(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: SetGroupAdminDto,
  ): Promise<GroupActionDto> {
    return this.groups.setAdmin(user.id, id, userId, dto.admin);
  }

  @ApiBearerAuth()
  @Delete(':id/members/:userId')
  @ApiOperation({
    operationId: 'Groups_removeMember',
    summary: 'Remove a member as an owner or admin',
  })
  @ApiOkResponse({ type: GroupActionDto })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<GroupActionDto> {
    return this.groups.remove(user.id, id, userId);
  }

  @ApiBearerAuth()
  @Post(':id/ownership/:userId')
  @ApiOperation({
    operationId: 'Groups_transferOwnership',
    summary: 'Transfer ownership to an active member',
  })
  @ApiOkResponse({ type: GroupActionDto })
  transfer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<GroupActionDto> {
    return this.groups.transfer(user.id, id, userId);
  }
}
