import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorageService } from '../storage/storage.service';
import { CompanyEventOrderBy } from './dto/list-company-events-query.dto';
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
  imageUrl: STORED_URL,
  eventDate: '2026-09-12',
};

// The rows the category count reads: one project per category name.
function projectsIn(...categories: string[]) {
  return categories.map((category) => ({ category }));
}

describe('ShowcaseItemsService', () => {
  let service: ShowcaseItemsService;
  const manager = {
    query: jest.fn(),
    getRepository: jest.fn(),
  };
  const repository = {
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    countBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    manager: {
      transaction: (work: (transactionManager: typeof manager) => unknown) =>
        work(manager),
    },
  };
  const storageService = {
    upload: jest.fn(),
    isUploadedImageUrl: jest.fn(),
    deleteUnusedImages: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    manager.getRepository.mockReturnValue(repository);
    storageService.isUploadedImageUrl.mockReturnValue(true);
    storageService.deleteUnusedImages.mockResolvedValue(undefined);
    repository.create.mockImplementation((entity: object) => entity);
    repository.save.mockImplementation((entity: object) =>
      Promise.resolve({
        showcaseItemId: 'item-id',
        createdAt: new Date(),
        ...entity,
      }),
    );
    repository.find.mockResolvedValue([]);
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
    { method: 'findCompanyEvent' as const, id: 'missing-event-id' },
    { method: 'removeCompanyEvent' as const, id: 'other-missing-event-id' },
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
      repository.findOneBy.mockResolvedValue({
        showcaseItemId: 'project-id',
        category: 'Estrutura',
      });
      repository.find
        .mockResolvedValueOnce(projectsIn('Estrutura', 'Estrutura'))
        .mockResolvedValueOnce(remainingItems);

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
    repository.findOneBy.mockResolvedValue({
      showcaseItemId: 'project-id',
      category: 'Estrutura',
    });
    repository.find.mockResolvedValueOnce(projectsIn('Estrutura', 'Estrutura'));
    if (failing === 'find') {
      repository.find.mockRejectedValueOnce(new Error('fora do ar'));
    } else {
      storageService.deleteUnusedImages.mockRejectedValue(
        new Error('fora do ar'),
      );
    }

    await expect(
      service.removePortfolioProject('project-id'),
    ).resolves.toBeUndefined();
    expect(repository.remove).toHaveBeenCalled();
  });

  it.each([
    {
      case: 'a fourth project in a category',
      projects: projectsIn('Estrutura', 'Estrutura', 'Estrutura'),
      category: 'Estrutura',
    },
    {
      case: 'a seventh category',
      projects: projectsIn('A', 'B', 'C', 'D', 'E', 'F'),
      category: 'G',
    },
  ])(
    'rejects $case with ConflictException, without saving',
    async ({ projects, category }) => {
      repository.find.mockResolvedValueOnce(projects);

      await expect(
        service.createPortfolioProject({
          ...validProject,
          category,
          imageUrl: STORED_URL,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      operation: 'creating a project',
      change: (target: ShowcaseItemsService) =>
        target.createPortfolioProject({
          ...validProject,
          imageUrl: STORED_URL,
        }),
    },
    {
      operation: 'updating an event',
      change: (target: ShowcaseItemsService) =>
        target.updateCompanyEvent('event-id', { title: 'Feira nova' }),
    },
  ])(
    'saves after taking the showcase lock when $operation',
    async ({ change }) => {
      repository.findOneBy.mockResolvedValue({ showcaseItemId: 'event-id' });

      await change(service);

      const [lockOrder] = manager.query.mock.invocationCallOrder;
      const [saveOrder] = repository.save.mock.invocationCallOrder;
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('pg_advisory_xact_lock'),
      );
      expect(lockOrder).toBeLessThan(saveOrder);
    },
  );

  it.each([
    {
      case: 'the last project of one of four categories',
      projects: projectsIn('A', 'B', 'C', 'D'),
      expectedError: ConflictException,
    },
    {
      case: 'a project of a category with another one',
      projects: projectsIn('A', 'A', 'B', 'C', 'D'),
      expectedError: undefined,
    },
  ])('on removing $case', async ({ projects, expectedError }) => {
    repository.findOneBy.mockResolvedValue({
      showcaseItemId: 'project-id',
      category: 'A',
    });
    repository.find.mockResolvedValueOnce(projects);

    const removal = service.removePortfolioProject('project-id');

    if (expectedError) {
      await expect(removal).rejects.toBeInstanceOf(expectedError);
      expect(repository.remove).not.toHaveBeenCalled();
    } else {
      await expect(removal).resolves.toBeUndefined();
      expect(repository.remove).toHaveBeenCalled();
    }
  });

  it.each([
    { method: 'renamePortfolioCategory' as const, args: [{ name: 'Nova' }] },
    { method: 'removePortfolioCategory' as const, args: [] },
  ])(
    '$method throws NotFoundException for an unknown category',
    async ({ method, args }) => {
      repository.find.mockResolvedValueOnce(projectsIn('A', 'B'));

      await expect(
        (
          service[method] as (
            category: string,
            ...rest: unknown[]
          ) => Promise<unknown>
        )('Inexistente', ...args),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it.each([
    {
      case: 'into a category with room',
      projects: projectsIn('A', 'B', 'C', 'D', 'E'),
      expectedError: undefined,
    },
    {
      case: 'into a category that would pass three projects',
      projects: projectsIn('A', 'A', 'B', 'B', 'C', 'D'),
      expectedError: ConflictException,
    },
  ])('renames category A $case', async ({ projects, expectedError }) => {
    repository.find.mockResolvedValueOnce(projects);
    jest.spyOn(service, 'findPortfolioCategories').mockResolvedValue([]);

    const rename = service.renamePortfolioCategory('A', { name: 'B' });

    if (expectedError) {
      await expect(rename).rejects.toBeInstanceOf(expectedError);
      expect(repository.update).not.toHaveBeenCalled();
    } else {
      await rename;
      expect(repository.update).toHaveBeenCalledWith(
        { type: ShowcaseItemType.PortfolioProject, category: 'A' },
        { category: 'B' },
      );
    }
  });

  it.each([
    {
      case: 'one of four categories',
      projects: projectsIn('A', 'B', 'C', 'D'),
      expectedError: ConflictException,
    },
    {
      case: 'one of five categories',
      projects: projectsIn('A', 'B', 'C', 'D', 'E'),
      expectedError: undefined,
    },
  ])(
    'on removing the category A as $case',
    async ({ projects, expectedError }) => {
      repository.find.mockResolvedValueOnce(projects);

      const removal = service.removePortfolioCategory('A');

      if (expectedError) {
        await expect(removal).rejects.toBeInstanceOf(expectedError);
        expect(repository.delete).not.toHaveBeenCalled();
      } else {
        await expect(removal).resolves.toBeUndefined();
        expect(repository.delete).toHaveBeenCalled();
      }
    },
  );

  it.each([
    {
      case: 'above the maximum of projects to a new name',
      projects: projectsIn('A', 'A', 'A', 'A', 'B', 'C', 'D'),
      newName: 'Nova',
      expectedError: undefined,
    },
    {
      case: 'above the maximum of projects into a category in use',
      projects: projectsIn('A', 'A', 'A', 'A', 'B', 'C', 'D'),
      newName: 'B',
      expectedError: ConflictException,
    },
  ])(
    'renames category A $case',
    async ({ projects, newName, expectedError }) => {
      repository.find.mockResolvedValueOnce(projects);
      jest.spyOn(service, 'findPortfolioCategories').mockResolvedValue([]);

      const rename = service.renamePortfolioCategory('A', { name: newName });

      if (expectedError) {
        await expect(rename).rejects.toBeInstanceOf(expectedError);
      } else {
        await expect(rename).resolves.toEqual([]);
      }
    },
  );

  it('removes a category with its projects and cleans the bucket', async () => {
    repository.find.mockResolvedValueOnce(
      projectsIn('A', 'A', 'B', 'C', 'D', 'E'),
    );

    await service.removePortfolioCategory('A');

    expect(repository.delete).toHaveBeenCalledWith({
      type: ShowcaseItemType.PortfolioProject,
      category: 'A',
    });
    expect(storageService.deleteUnusedImages).toHaveBeenCalled();
  });

  it.each([
    {
      orderBy: undefined,
      expectedOrder: { eventDate: 'DESC', createdAt: 'DESC' },
    },
    {
      orderBy: CompanyEventOrderBy.EventDate,
      expectedOrder: { eventDate: 'DESC', createdAt: 'DESC' },
    },
    {
      orderBy: CompanyEventOrderBy.CreatedAt,
      expectedOrder: { createdAt: 'DESC' },
    },
  ])(
    'lists the events ordered by $orderBy',
    async ({ orderBy, expectedOrder }) => {
      await service.findCompanyEvents({ orderBy });

      expect(repository.find).toHaveBeenCalledWith({
        where: { type: ShowcaseItemType.CompanyEvent },
        order: expectedOrder,
      });
    },
  );

  it.each([
    { case: 'an eleventh event', operation: 'create' as const, total: 10 },
    { case: 'below three events', operation: 'remove' as const, total: 3 },
  ])(
    'rejects $case with ConflictException, without writing',
    async ({ operation, total }) => {
      repository.countBy.mockResolvedValue(total);
      repository.findOneBy.mockResolvedValue({ showcaseItemId: 'event-id' });

      const change =
        operation === 'create'
          ? service.createCompanyEvent(validEvent)
          : service.removeCompanyEvent('event-id');

      await expect(change).rejects.toBeInstanceOf(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      operation: 'creating',
      change: (target: ShowcaseItemsService) =>
        target.createCompanyEvent(validEvent),
    },
    {
      operation: 'updating',
      change: (target: ShowcaseItemsService) =>
        target.updateCompanyEvent('event-id', { imageUrl: STORED_URL }),
    },
    {
      operation: 'removing',
      change: (target: ShowcaseItemsService) =>
        target.removeCompanyEvent('event-id'),
    },
  ])(
    'cleans the unused images after $operation an event',
    async ({ change }) => {
      repository.countBy.mockResolvedValue(5);
      repository.findOneBy.mockResolvedValue({
        showcaseItemId: 'event-id',
        imageUrl: STORED_URL,
      });

      await change(service);

      expect(storageService.deleteUnusedImages).toHaveBeenCalledWith(
        'showcase',
        [],
      );
    },
  );
});
