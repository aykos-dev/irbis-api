import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ConditionsService } from './conditions.service.js';
import { IdParamDto } from './dto/conditions.request.dto.js';
import { PlaceConditionDto } from './dto/conditions.response.dto.js';

@ApiTags('Conditions')
@Controller('places')
export class ConditionsController {
  constructor(private readonly conditions: ConditionsService) {}

  @Public()
  @Get(':id/condition')
  @ApiOperation({
    operationId: 'Conditions_getForPlace',
    summary: "A place's weekend condition",
  })
  @ApiOkResponse({ type: PlaceConditionDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    404: ['PLACE_NOT_FOUND'],
  })
  get(@Param() { id }: IdParamDto): Promise<PlaceConditionDto> {
    return this.conditions.getCondition(id);
  }
}
