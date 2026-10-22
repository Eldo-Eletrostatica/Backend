import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShowcaseItem } from './entities/showcase-item.entity';
import { ShowcaseItemsService } from './showcase-items.service';

describe('ShowcaseItemsService', () => {
  let service: ShowcaseItemsService;
  const repository = {
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ShowcaseItemsService,
        { provide: getRepositoryToken(ShowcaseItem), useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ShowcaseItemsService);
  });

  it.each([
    { page: 1, limit: 5, total: 12, expectedSkip: 0, hasNextPage: true },
    { page: 3, limit: 5, total: 12, expectedSkip: 10, hasNextPage: false },
    { page: 2, limit: 6, total: 12, expectedSkip: 6, hasNextPage: false },
  ])(
    'paginates page $page with limit $limit',
    async ({ page, limit, total, expectedSkip, hasNextPage }) => {
      repository.findAndCount.mockResolvedValue([[], total]);

      const result = await service.findPortfolioProjects({ page, limit });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: expectedSkip, take: limit }),
      );
      expect(result.hasNextPage).toBe(hasNextPage);
    },
  );

  it.each([
    { category: 'Estrutura Metálica', hasFilter: true },
    { category: undefined, hasFilter: false },
  ])('filters by category $category', async ({ category, hasFilter }) => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findPortfolioProjects({ category });

    const calls = repository.findAndCount.mock.calls as [
      { where: Record<string, unknown> },
    ][];
    const options = calls[0][0];
    expect('category' in options.where).toBe(hasFilter);
  });

  it.each([
    { method: 'findPortfolioProject' as const, id: 'missing-id' },
    { method: 'removePortfolioProject' as const, id: 'other-missing-id' },
  ])(
    '$method throws NotFoundException for the unknown id $id',
    async ({ method, id }) => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service[method](id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    },
  );
});
