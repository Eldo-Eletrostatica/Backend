import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShowcaseItemsService } from './showcase-items.service';
import {
  ShowcaseItem,
  ShowcaseItemType,
} from './entities/showcase-item.entity';

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
    { method: 'findPortfolioProject' as const },
    { method: 'removePortfolioProject' as const },
  ])(
    '$method throws NotFoundException for an unknown id',
    async ({ method }) => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service[method]('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    },
  );
  it('lists events newest first, filtering by the event type', async () => {
    repository.find.mockResolvedValue([]);

    await service.findCompanyEvents();

    expect(repository.find).toHaveBeenCalledWith({
      where: { type: ShowcaseItemType.CompanyEvent },
      order: { eventDate: 'DESC', createdAt: 'DESC' },
    });
  });

  it.each([
    { method: 'findCompanyEvent' as const },
    { method: 'removeCompanyEvent' as const },
  ])(
    '$method looks only at events and throws NotFoundException',
    async ({ method }) => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service[method]('project-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.findOneBy).toHaveBeenCalledWith({
        showcaseItemId: 'project-id',
        type: ShowcaseItemType.CompanyEvent,
      });
    },
  );

  it.each([
    { title: 'Feira Industrial', eventDate: '2026-09-12' },
    { title: 'Visita de clientes', eventDate: '2026-03-01' },
  ])('creates the event "$title" with the event type', async (input) => {
    repository.countBy.mockResolvedValue(0);
    repository.create.mockImplementation((entity: object) => entity);
    repository.save.mockImplementation((entity: object) =>
      Promise.resolve({
        ...entity,
        showcaseItemId: 'event-id',
        createdAt: new Date(),
      }),
    );

    const result = await service.createCompanyEvent({
      ...input,
      description: 'Descrição do evento',
      imageUrl: 'https://exemplo.com/evento.jpg',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: ShowcaseItemType.CompanyEvent }),
    );
    expect(result.eventDate).toBe(input.eventDate);
  });

  it.each([
    { total: 9, shouldFail: false },
    { total: 10, shouldFail: true },
  ])(
    'create event with $total existing fails: $shouldFail',
    async ({ total, shouldFail }) => {
      repository.countBy.mockResolvedValue(total);
      repository.create.mockImplementation((entity: object) => entity);
      repository.save.mockImplementation((entity: object) =>
        Promise.resolve({
          ...entity,
          showcaseItemId: 'event-id',
          createdAt: new Date(),
        }),
      );
      const dto = {
        title: 'Feira',
        description: 'Descrição',
        imageUrl: 'https://exemplo.com/a.jpg',
        eventDate: '2026-09-12',
      };

      let error: unknown;
      try {
        await service.createCompanyEvent(dto);
      } catch (caught) {
        error = caught;
      }

      if (shouldFail) {
        expect(error).toBeInstanceOf(BadRequestException);
      } else {
        expect(error).toBeUndefined();
      }
    },
  );
});
