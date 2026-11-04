import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_LIST_LIMIT,
  GROUP_NAME_MAX,
  GROUP_NAME_MIN,
  GROUP_VISIBILITIES,
  type GroupVisibilityCode,
} from '../groups.constants.js';

export class GroupsListQueryDto {
  @ApiPropertyOptional({ maxLength: GROUP_NAME_MAX })
  @IsOptional() @IsString() @MaxLength(GROUP_NAME_MAX) q?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: GROUP_LIST_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(GROUP_LIST_LIMIT)
  limit?: number;
}

export class CreateGroupDto {
  @ApiProperty({ minLength: GROUP_NAME_MIN, maxLength: GROUP_NAME_MAX })
  @IsString() @Length(GROUP_NAME_MIN, GROUP_NAME_MAX) name: string;
  @ApiProperty({ maxLength: GROUP_DESCRIPTION_MAX })
  @IsString() @MaxLength(GROUP_DESCRIPTION_MAX) description: string;
  @ApiProperty({ enum: GROUP_VISIBILITIES })
  @IsEnum(GROUP_VISIBILITIES) visibility: GroupVisibilityCode;
  @ApiPropertyOptional({ example: '#0C807A' })
  @IsOptional() @IsHexColor() color?: string;
}

export class UpdateGroupDto {
  @ApiPropertyOptional({ minLength: GROUP_NAME_MIN, maxLength: GROUP_NAME_MAX })
  @IsOptional()
  @IsString()
  @Length(GROUP_NAME_MIN, GROUP_NAME_MAX)
  name?: string;
  @ApiPropertyOptional({ maxLength: GROUP_DESCRIPTION_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(GROUP_DESCRIPTION_MAX)
  description?: string;
  @ApiPropertyOptional({ enum: GROUP_VISIBILITIES })
  @IsOptional() @IsEnum(GROUP_VISIBILITIES) visibility?: GroupVisibilityCode;
  @ApiPropertyOptional({ example: '#0C807A' })
  @IsOptional() @IsHexColor() color?: string;
}

export class InviteGroupMemberDto {
  @ApiProperty({ minLength: 3, maxLength: 20 })
  @IsString() @Length(3, 20) username: string;
}

export class SetGroupAdminDto {
  @ApiProperty()
  @IsBoolean() admin: boolean;
}

export class GroupMemberParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID() userId: string;
}
