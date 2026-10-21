import { Test, TestingModule } from '@nestjs/testing';
import { ShowcaseItemsController } from './showcase-items.controller';
import { ShowcaseItemsService } from './showcase-items.service';

describe('ShowcaseItemsController', () => {
  let controller: ShowcaseItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShowcaseItemsController],
      providers: [{ provide: ShowcaseItemsService, useValue: {} }],
    }).compile();

    controller = module.get<ShowcaseItemsController>(ShowcaseItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
