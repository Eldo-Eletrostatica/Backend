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
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
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

  it.each([
    { origin: 'another site', url: 'https://exemplo.com/capa.jpg' },
    {
      origin: 'another bucket folder',
      url: `${PUBLIC_URL}/visual/${STORED_NAME}`,
    },
    {
      origin: 'a name the upload does not generate',
      url: `${PUBLIC_URL}/showcase/capa.png`,
    },
  ])('rejects a cover from $origin', async ({ url }) => {
    await expect(
      service.createPortfolioProject({ ...validProject, imageUrl: url }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([
    { photo: 'beforeUrl' as const, label: 'before photo' },
    { photo: 'afterUrl' as const, label: 'after photo' },
  ])('accepts the $label from the bucket', async ({ photo }) => {
    repository.create.mockImplementation((entity: object) => entity);
    repository.save.mockImplementation((entity: object) =>
      Promise.resolve({
        ...entity,
        showcaseItemId: 'project-id',
        createdAt: new Date(),
      }),
    );

    const result = await service.createPortfolioProject({
      ...validProject,
      imageUrl: STORED_URL,
      [photo]: STORED_URL,
    });

    expect(result[photo]).toBe(STORED_URL);
  });

  it.each([
    {
      case: 'only the cover',
      beforeUrl: null,
      expectedKeys: [`showcase/${STORED_NAME}`],
    },
    {
      case: 'the cover and the before photo',
      beforeUrl: `${PUBLIC_URL}/showcase/other.png`,
      expectedKeys: [`showcase/${STORED_NAME}`, 'showcase/other.png'],
    },
  ])(
    'deletes from the bucket $case of a removed project',
    async ({ beforeUrl, expectedKeys }) => {
      repository.findOneBy.mockResolvedValue({
        showcaseItemId: 'project-id',
        imageUrl: STORED_URL,
        beforeUrl,
        afterUrl: null,
      });
      repository.remove.mockResolvedValue(undefined);
      storageService.deleteMany.mockResolvedValue(undefined);

      await service.removePortfolioProject('project-id');

      expect(storageService.deleteMany).toHaveBeenCalledWith(expectedKeys);
    },
  );
});
