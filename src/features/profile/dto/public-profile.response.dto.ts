import { ApiProperty } from '@nestjs/swagger';
import {
  HOME_REGIONS,
  type HomeRegionCode,
} from '../../../common/profile.constants.js';

/** What anyone can see about a public profile: no phone, role, XP or preferences. */
export class PublicProfileResponseDto {
  @ApiProperty({ example: 'guest_1' })
  username: string;

  @ApiProperty({ type: String, nullable: true, maxLength: 40 })
  displayName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null when no avatar is set or storage is unavailable.',
  })
  avatarUrl: string | null;

  @ApiProperty({ type: String, nullable: true, maxLength: 150 })
  bio: string | null;

  @ApiProperty({
    enum: HOME_REGIONS,
    enumName: 'HomeRegion',
    nullable: true,
    description: 'Only returned when the owner shows their home region.',
  })
  homeRegion: HomeRegionCode | null;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 7, example: 1 })
  level: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ description: 'The owner allows stats on the public profile.' })
  showStats: boolean;
}
