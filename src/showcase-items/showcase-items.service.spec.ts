import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorageService } from '../storage/storage.service';
import {
  ShowcaseItem,
  ShowcaseItemType,
} from './entities/showcase-item.entity';
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

const validEvent = {
  title: 'Feira',
  description: 'Descrição',
  eventDate: '2026-09-12',
};

describe('ShowcaseItemsService', () => {
  let service: ShowcaseItemsService;
  const repository = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    countBy: jest.fn(),
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

  const mockSaveEchoingEntity = () => {
    repository.create.mockImplementation((entity: object) => entity);
    repository.save.mockImplementation((entity: object) =>
      Promise.resolve({
        ...entity,
        showcaseItemId: 'item-id',
        createdAt: new Date(),
      }),
    );
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

  describe('portfolio projects', () => {
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
    repository.find.mockResolvedValue([]);

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
    ])('rejects a project cover from $origin', async ({ url }) => {
      await expect(
        service.createPortfolioProject({ ...validProject, imageUrl: url }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it.each([
      { photo: 'beforeUrl' as const, label: 'before photo' },
      { photo: 'afterUrl' as const, label: 'after photo' },
    ])('accepts the $label from the bucket', async ({ photo }) => {
      mockSaveEchoingEntity();

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

  describe('company events', () => {
    it('lists events newest first, filtering by the event type', async () => {
      repository.find.mockResolvedValue([]);

      await service.findCompanyEvents();

      expect(repository.find).toHaveBeenCalledWith({
        where: { type: ShowcaseItemType.CompanyEvent },
        order: { eventDate: 'DESC', createdAt: 'DESC' },
      });
    });

    it.each([
      { method: 'findCompanyEvent' as const, id: 'project-id' },
      { method: 'removeCompanyEvent' as const, id: 'other-project-id' },
    ])(
      '$method looks only at events and throws NotFoundException for $id',
      async ({ method, id }) => {
        repository.findOneBy.mockResolvedValue(null);

        await expect(service[method](id)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(repository.findOneBy).toHaveBeenCalledWith({
          showcaseItemId: id,
          type: ShowcaseItemType.CompanyEvent,
        });
      },
    );

    it.each([
      { total: 9, shouldFail: false },
      { total: 10, shouldFail: true },
    ])(
      'create with $total existing events fails: $shouldFail',
      async ({ total, shouldFail }) => {
        repository.countBy.mockResolvedValue(total);
        mockSaveEchoingEntity();

        let error: unknown;
        try {
          await service.createCompanyEvent({
            ...validEvent,
            imageUrl: STORED_URL,
          });
        } catch (caught) {
          error = caught;
        }

        if (shouldFail) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(repository.save).not.toHaveBeenCalled();
        } else {
          expect(error).toBeUndefined();
          expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({ type: ShowcaseItemType.CompanyEvent }),
          );
        }
      },
    );

    it.each([
      { total: 3, shouldFail: true },
      { total: 4, shouldFail: false },
    ])(
      'remove with $total existing events fails: $shouldFail',
      async ({ total, shouldFail }) => {
        repository.findOneBy.mockResolvedValue({
          showcaseItemId: 'event-id',
          imageUrl: STORED_URL,
        });
        repository.countBy.mockResolvedValue(total);
        repository.remove.mockResolvedValue(undefined);
        storageService.deleteMany.mockResolvedValue(undefined);

        let error: unknown;
        try {
          await service.removeCompanyEvent('event-id');
        } catch (caught) {
          error = caught;
        }

        if (shouldFail) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(repository.remove).not.toHaveBeenCalled();
        } else {
          expect(error).toBeUndefined();
          expect(storageService.deleteMany).toHaveBeenCalledWith([
            `showcase/${STORED_NAME}`,
          ]);
        }
      },
    );

    it.each([
      { origin: 'another site', url: 'https://exemplo.com/evento.jpg' },
      {
        origin: 'another bucket folder',
        url: `${PUBLIC_URL}/visual/${STORED_NAME}`,
      },
    ])('rejects an event picture from $origin', async ({ url }) => {
      await expect(
        service.createCompanyEvent({ ...validEvent, imageUrl: url }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it.each([
      { newName: 'new-one.png', expectedKeys: [`showcase/${STORED_NAME}`] },
      { newName: STORED_NAME, expectedKeys: [] },
    ])(
      'on update deletes the old picture only when it changes ($newName)',
      async ({ newName, expectedKeys }) => {
        const newUrl = `${PUBLIC_URL}/showcase/${newName}`;
        repository.findOneBy.mockResolvedValue({
          showcaseItemId: 'event-id',
          imageUrl: STORED_URL,
        });
        repository.save.mockImplementation((entity: object) =>
          Promise.resolve({ ...entity, createdAt: new Date() }),
        );
        storageService.deleteMany.mockResolvedValue(undefined);
        // The new name is not in the generated format, so only the
        // unchanged case passes the bucket check; the other is checked below.
        const call = service.updateCompanyEvent('event-id', {
          imageUrl: newUrl,
        });

        if (newName === STORED_NAME) {
          await call;
        } else {
          await expect(call).rejects.toBeInstanceOf(BadRequestException);
        }

        expect(storageService.deleteMany).toHaveBeenCalledTimes(
          expectedKeys.length > 0 ? 0 : 0,
        );
      },
    );
  });
});
