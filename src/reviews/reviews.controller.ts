import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ReviewsResponseDto } from './dto/reviews-response.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as avaliações da empresa no Google' })
  @ApiOkResponse({ type: ReviewsResponseDto })
  findAll(): Promise<ReviewsResponseDto> {
    return this.reviewsService.findAll();
  }
}
