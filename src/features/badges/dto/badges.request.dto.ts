import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsString,
} from 'class-validator';
import { SHOWCASE_MAX } from '../badges.constants.js';

/** The four badges pinned to the profile; an empty list clears the picks. */
export class SetShowcaseDto {
  @ApiProperty({
    type: [String],
    maxItems: SHOWCASE_MAX,
    uniqueItems: true,
    example: ['peak-bagger-1', 'region-tashkent'],
    description: 'Earned badge keys, in display order. At most four.',
  })
  @IsArray()
  @ArrayMaxSize(SHOWCASE_MAX)
  @ArrayUnique()
  @IsString({ each: true })
  keys: string[];
}
