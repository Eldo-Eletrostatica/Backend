import { BadRequestException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorageService } from '../storage/storage.service';
import { ShowcaseItemsService } from './showcase-items.service';

const PUBLIC_URL = 'http://localhost:8333/eldo';
const STORED_NAME = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b.png';
const STORED_URL = `${PUBLIC_URL}/showcase/${STORED_NAME}`;

const validProject = {
  title: 'Portão',
  description: 'Descrição',
  category: 'Estrutura',
  serviceType: 'Epóxi',
  materials: 'Aço',
};

describe('ShowcaseItemsService', () => {
  let service: ShowcaseItemsService;
  jest.fn();
  const repository = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    countBy: jest.fn(),
  };
  const storageService = {
    publicUrl: PUBLIC_URL,
    upload: jest.fn(),
    deleteMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    storageService.publicUrl = PUBLIC_URL;
    const moduleRef = await Test.createTestingModule({
      providers: [
        ShowcaseItemsService,
        { provide: getRepositoryToken(ShowcaseItem), useValue: repository },
        { provide: StorageService, useValue: storageService },
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
    expect('category' in calls[0][0].where).toBe(hasFilter);
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
