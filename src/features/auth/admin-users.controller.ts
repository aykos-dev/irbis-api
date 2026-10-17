import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminUsersService } from './admin-users.service.js';
import {
  AdminAuditListResponseDto,
  AdminAuditQueryDto,
  AdminUserDetailDto,
  AdminUserListResponseDto,
  AdminUsersQueryDto,
  BlockUserDto,
  SetUserPasswordDto,
  SetUserRecoveryPhoneDto,
  SetUserRoleDto,
  UnblockUserDto,
  UserIdParamDto,
  UserStatsResponseDto,
} from './dto/admin.dto.js';

const ADMIN_ERRORS = {
  401: ['UNAUTHENTICATED'],
  403: ['FORBIDDEN', 'ACCOUNT_BLOCKED'],
};

/** Admin panel API: every route needs the `admin` role. */
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get('stats/users')
  @ApiOperation({
    operationId: 'Admin_userStats',
    summary: 'Dashboard aggregates',
  })
  @ApiOkResponse({ type: UserStatsResponseDto })
  @ApiErrorResponses(ADMIN_ERRORS)
  stats(): Promise<UserStatsResponseDto> {
    return this.users.stats();
  }

  @Get('users')
  @ApiOperation({
    operationId: 'Admin_listUsers',
    summary: 'Search, filter, sort and page through users',
  })
  @ApiOkResponse({ type: AdminUserListResponseDto })
  @ApiErrorResponses({ ...ADMIN_ERRORS, 400: ['VALIDATION_FAILED'] })
  list(@Query() query: AdminUsersQueryDto): Promise<AdminUserListResponseDto> {
    return this.users.list(query);
  }

  @Get('users/:id')
  @ApiOperation({ operationId: 'Admin_getUser', summary: 'User detail' })
  @ApiOkResponse({ type: AdminUserDetailDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['NOT_FOUND'],
  })
  detail(@Param() { id }: UserIdParamDto): Promise<AdminUserDetailDto> {
    return this.users.detail(id);
  }

  @Post('users/:id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Admin_blockUser',
    summary: 'Block a user and sign them out everywhere',
  })
  @ApiOkResponse({ type: AdminUserDetailDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['NOT_FOUND'],
    409: ['ALREADY_BLOCKED'],
  })
  block(
    @CurrentUser() admin: AuthUser,
    @Param() { id }: UserIdParamDto,
    @Body() dto: BlockUserDto,
  ): Promise<AdminUserDetailDto> {
    return this.users.block(admin.id, id, dto);
  }

  @Post('users/:id/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'Admin_unblockUser', summary: 'Lift a block' })
  @ApiOkResponse({ type: AdminUserDetailDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['NOT_FOUND'],
    409: ['NOT_BLOCKED'],
  })
  unblock(
    @CurrentUser() admin: AuthUser,
    @Param() { id }: UserIdParamDto,
    @Body() dto: UnblockUserDto,
  ): Promise<AdminUserDetailDto> {
    return this.users.unblock(admin.id, id, dto);
  }

  @Put('users/:id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'Admin_setUserPassword',
    summary: "Set a user's password (permanent); signs them out everywhere",
  })
  @ApiNoContentResponse()
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED', 'PASSWORD_WEAK'],
    404: ['NOT_FOUND'],
  })
  setPassword(
    @CurrentUser() admin: AuthUser,
    @Param() { id }: UserIdParamDto,
    @Body() dto: SetUserPasswordDto,
  ): Promise<void> {
    return this.users.setPassword(admin.id, id, dto);
  }

  @Put('users/:id/recovery-phone')
  @ApiOperation({
    operationId: 'Admin_setUserRecoveryPhone',
    summary: "Set a user's recovery phone (verified at once)",
  })
  @ApiOkResponse({ type: AdminUserDetailDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED', 'PHONE_INVALID'],
    404: ['NOT_FOUND'],
  })
  setRecoveryPhone(
    @CurrentUser() admin: AuthUser,
    @Param() { id }: UserIdParamDto,
    @Body() dto: SetUserRecoveryPhoneDto,
  ): Promise<AdminUserDetailDto> {
    return this.users.setRecoveryPhone(admin.id, id, dto);
  }

  @Put('users/:id/role')
  @ApiOperation({
    operationId: 'Admin_setUserRole',
    summary: "Change a user's role (not your own)",
  })
  @ApiOkResponse({ type: AdminUserDetailDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    403: ['FORBIDDEN', 'ACCOUNT_BLOCKED', 'CANNOT_CHANGE_OWN_ROLE'],
    404: ['NOT_FOUND'],
  })
  setRole(
    @CurrentUser() admin: AuthUser,
    @Param() { id }: UserIdParamDto,
    @Body() dto: SetUserRoleDto,
  ): Promise<AdminUserDetailDto> {
    return this.users.setRole(admin.id, id, dto);
  }

  @Get('users/:id/audit')
  @ApiOperation({
    operationId: 'Admin_userAudit',
    summary: 'Audit log of admin actions on a user, newest first',
  })
  @ApiOkResponse({ type: AdminAuditListResponseDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['NOT_FOUND'],
  })
  audit(
    @Param() { id }: UserIdParamDto,
    @Query() query: AdminAuditQueryDto,
  ): Promise<AdminAuditListResponseDto> {
    return this.users.listAudit(id, query);
  }
}
