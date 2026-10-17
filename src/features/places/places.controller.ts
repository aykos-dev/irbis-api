import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import {
  PlaceOriginQueryDto,
  PlacesQueryDto,
} from './dto/places.request.dto.js';
import {
  PlaceDetailDto,
  PlaceListResponseDto,
} from './dto/places.response.dto.js';
import { PlacesService } from './places.service.js';

/** Non-uuid ids answer 400 VALIDATION_FAILED like every other bad input. */
function uuidPipe(): ParseUUIDPipe {
  return new ParseUUIDPipe({
    exceptionFactory: () => new RequestValidationError({ id: ['isUuid'] }),
  });
}

@ApiTags('Places')
@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Public()
  @Get()
  @ApiOperation({
    operationId: 'Places_list',
    summary: 'Places sorted by distance from the device or Tashkent',
  })
  @ApiOkResponse({ type: PlaceListResponseDto })
  @ApiErrorResponses({ 400: ['VALIDATION_FAILED'] })
  list(@Query() query: PlacesQueryDto): Promise<PlaceListResponseDto> {
    return this.places.list(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ operationId: 'Places_get', summary: 'One place' })
  @ApiOkResponse({ type: PlaceDetailDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    404: ['PLACE_NOT_FOUND'],
  })
  detail(
    @Param('id', uuidPipe()) id: string,
    @Query() query: PlaceOriginQueryDto,
  ): Promise<PlaceDetailDto> {
    return this.places.detail(id, query);
  }
}
