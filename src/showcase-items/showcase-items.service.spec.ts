import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorageService } from '../storage/storage.service';
import { ShowcaseItem } from './entities/showcase-item.entity';
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
  const repository = {
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const storageService = {
    upload: jest.fn(),
    isUploadedImageUrl: jest.fn(),
    deleteUnusedImages: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
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

  it.each([
    { photo: 'imageUrl' as const, url: 'https://exemplo.com/capa.jpg' },
    { photo: 'beforeUrl' as const, url: `${PUBLIC_URL}/visual/${STORED_NAME}` },
  ])(
    'rejects a $photo the upload route did not return',
    async ({ photo, url }) => {
      storageService.isUploadedImageUrl.mockImplementation(
        (candidate: string) => candidate !== url,
      );

      await expect(
        service.createPortfolioProject({
          ...validProject,
          imageUrl: STORED_URL,
          [photo]: url,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it.each([
    { photo: 'beforeUrl' as const, label: 'before photo' },
    { photo: 'afterUrl' as const, label: 'after photo' },
  ])('accepts the $label from the bucket', async ({ photo }) => {
    storageService.isUploadedImageUrl.mockReturnValue(true);
    repository.create.mockImplementation((entity: object) => entity);
    repository.save.mockImplementation((entity: object) =>
      Promise.resolve({
        ...entity,
        showcaseItemId: 'project-id',
        createdAt: new Date(),
      }),
    );
    repository.find.mockResolvedValue([]);

    const result = await service.createPortfolioProject({
      ...validProject,
      imageUrl: STORED_URL,
      [photo]: STORED_URL,
    });

    expect(result[photo]).toBe(STORED_URL);
  });

  it.each([
    {
      case: 'the pictures of the remaining items',
      remainingItems: [
        { imageUrl: STORED_URL, beforeUrl: null, afterUrl: null },
      ],
      expectedUsedUrls: [STORED_URL, null, null],
    },
    {
      case: 'no picture when the table is empty',
      remainingItems: [],
      expectedUsedUrls: [],
    },
  ])(
    'keeps in the bucket $case after a removal',
    async ({ remainingItems, expectedUsedUrls }) => {
      repository.findOneBy.mockResolvedValue({ showcaseItemId: 'project-id' });
      repository.remove.mockResolvedValue(undefined);
      repository.find.mockResolvedValue(remainingItems);
      storageService.deleteUnusedImages.mockResolvedValue(undefined);

      await service.removePortfolioProject('project-id');

      expect(storageService.deleteUnusedImages).toHaveBeenCalledWith(
        'showcase',
        expectedUsedUrls,
      );
    },
  );

  it.each([
    { operation: 'listing the items', failing: 'find' as const },
    {
      operation: 'cleaning the bucket',
      failing: 'deleteUnusedImages' as const,
    },
  ])('still removes the project when $operation fails', async ({ failing }) => {
    repository.findOneBy.mockResolvedValue({ showcaseItemId: 'project-id' });
    repository.remove.mockResolvedValue(undefined);
    repository.find.mockResolvedValue([]);
    storageService.deleteUnusedImages.mockResolvedValue(undefined);
    const failingMock =
      failing === 'find' ? repository.find : storageService.deleteUnusedImages;
    failingMock.mockRejectedValue(new Error('fora do ar'));

    await expect(
      service.removePortfolioProject('project-id'),
    ).resolves.toBeUndefined();
    expect(repository.remove).toHaveBeenCalled();
  });
});
