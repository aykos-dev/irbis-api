import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { NotificationsQueryDto } from './dto/notifications.request.dto.js';
import {
  NotificationsListResponseDto,
  NotificationsReadAllResponseDto,
} from './dto/notifications.response.dto.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({
    operationId: 'Notifications_list',
    summary: "The signed-in user's notifications, newest first",
    description:
      'Titles and bodies are localized to the account locale. `unreadCount` covers every category.',
  })
  @ApiOkResponse({ type: NotificationsListResponseDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
  })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: NotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    return this.notifications.list(user.id, query);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Notifications_readAll',
    summary: 'Mark every unread notification of the signed-in user as read',
  })
  @ApiOkResponse({ type: NotificationsReadAllResponseDto })
  @ApiErrorResponses({
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
  })
  readAll(
    @CurrentUser() user: AuthUser,
  ): Promise<NotificationsReadAllResponseDto> {
    return this.notifications.markAllRead(user.id);
  }
}
