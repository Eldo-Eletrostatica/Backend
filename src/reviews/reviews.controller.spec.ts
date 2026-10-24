import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewsResponseDto } from './dto/reviews-response.dto';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  const serviceResponse: ReviewsResponseDto = {
    isAvailable: true,
    googleProfileUrl: 'https://maps.google.com/?cid=123',
    reviews: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: { findAll: jest.fn().mockResolvedValue(serviceResponse) },
        },
      ],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  it('returns what the service returns', async () => {
    await expect(controller.findAll()).resolves.toBe(serviceResponse);
  });
});
