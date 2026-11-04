import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { GroupMessageDto } from './dto/group-chat.response.dto.js';

export type GroupChatEvent =
  | {
      type: 'message.created' | 'message.updated' | 'message.deleted';
      groupId: string;
      message: GroupMessageDto;
    }
  | {
      type: 'reaction.changed' | 'read.changed';
      groupId: string;
      messageId: string;
      userId: string;
    }
  | {
      type: 'typing.changed';
      groupId: string;
      userId: string;
      typing: boolean;
    };

@Injectable()
export class GroupChatEvents {
  readonly stream = new Subject<GroupChatEvent>();
  emit(event: GroupChatEvent): void {
    this.stream.next(event);
  }
}
