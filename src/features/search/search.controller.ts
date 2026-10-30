import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { OptionalUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttled } from '../../common/decorators/throttle.decorator.js';
import { SearchQueryDto } from './dto/search.request.dto.js';
import { SearchResultsDto } from './dto/search.response.dto.js';
import { SearchService } from './search.service.js';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Throttled('lookup')
  @Get()
  @ApiOperation({
    operationId: 'Search_query',
    summary: 'Search places and people; groups and tours are empty for now',
  })
  @ApiOkResponse({ type: SearchResultsDto })
  @ApiErrorResponses({ 400: ['VALIDATION_FAILED'], 429: ['RATE_LIMITED'] })
  query(
    @Query() query: SearchQueryDto,
    @OptionalUser() viewer: AuthUser | undefined,
  ): Promise<SearchResultsDto> {
    return this.search.search(query, viewer?.id);
  }
}
