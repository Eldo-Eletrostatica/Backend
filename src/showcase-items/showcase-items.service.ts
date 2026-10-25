import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadedImageDto } from '../storage/dto/uploaded-image.dto';
import {
  detectImageFormat,
  UNSUPPORTED_IMAGE_MESSAGE,
} from '../storage/image-format';
import { StorageService } from '../storage/storage.service';
import { CompanyEventResponseDto } from './dto/company-event-response.dto';
import { CreateCompanyEventDto } from './dto/create-company-event.dto';
import { CreatePortfolioProjectDto } from './dto/create-portfolio-project.dto';
import {
  CompanyEventOrderBy,
  ListCompanyEventsQueryDto,
} from './dto/list-company-events-query.dto';
import { ListPortfolioProjectsQueryDto } from './dto/list-portfolio-projects-query.dto';
import {
  PaginatedPortfolioProjectsDto,
  PortfolioProjectResponseDto,
} from './dto/portfolio-project-response.dto';
import { RenamePortfolioCategoryDto } from './dto/rename-portfolio-category.dto';
import { UpdateCompanyEventDto } from './dto/update-company-event.dto';
import { UpdatePortfolioProjectDto } from './dto/update-portfolio-project.dto';
import {
  ShowcaseItem,
  ShowcaseItemType,
} from './entities/showcase-item.entity';
import {
  DEFAULT_PAGE_SIZE,
  SHOWCASE_IMAGES_FOLDER,
} from './showcase-items.constants';
import {
  assertCompanyEventLimits,
  assertPortfolioLimits,
  ProjectsPerPortfolioCategory,
  withPortfolioCategoryRemoved,
  withPortfolioCategoryRenamed,
  withProjectMoved,
} from './showcase-limits';

@Injectable()
export class ShowcaseItemsService {
  private readonly logger = new Logger(ShowcaseItemsService.name);

  constructor(
    @InjectRepository(ShowcaseItem)
    private readonly showcaseItemsRepository: Repository<ShowcaseItem>,
    private readonly storageService: StorageService,
  ) {}

  async uploadShowcaseImage(content: Buffer): Promise<UploadedImageDto> {
    const format = detectImageFormat(content);
    if (format === null) {
      throw new BadRequestException(UNSUPPORTED_IMAGE_MESSAGE);
    }
    const { url } = await this.storageService.upload(
      { content, ...format },
      SHOWCASE_IMAGES_FOLDER,
    );
    return { url };
  }

  async findPortfolioProjects(
    query: ListPortfolioProjectsQueryDto,
  ): Promise<PaginatedPortfolioProjectsDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;

    const [items, total] = await this.showcaseItemsRepository.findAndCount({
      where: {
        type: ShowcaseItemType.PortfolioProject,
        ...(query.category ? { category: query.category } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((item) => PortfolioProjectResponseDto.fromEntity(item)),
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
    };
  }

  // Gallery filter buttons: the glossary defines alphabetical order.
  async findPortfolioCategories(): Promise<string[]> {
    const rows = await this.showcaseItemsRepository
      .createQueryBuilder('showcaseItem')
      .select('showcaseItem.category', 'category')
      .distinct(true)
      .where('showcaseItem.type = :type', {
        type: ShowcaseItemType.PortfolioProject,
      })
      .andWhere('showcaseItem.category IS NOT NULL')
      .orderBy('showcaseItem.category', 'ASC')
      .getRawMany<{ category: string }>();

    return rows.map((row) => row.category);
  }

  async findPortfolioProject(
    showcaseItemId: string,
  ): Promise<PortfolioProjectResponseDto> {
    return PortfolioProjectResponseDto.fromEntity(
      await this.findPortfolioProjectOrFail(
        this.showcaseItemsRepository,
        showcaseItemId,
      ),
    );
  }

  async createPortfolioProject(
    dto: CreatePortfolioProjectDto,
  ): Promise<PortfolioProjectResponseDto> {
    this.assertImagesFromUpload([dto.imageUrl, dto.beforeUrl, dto.afterUrl]);
    const project = await this.withShowcaseLock(async (repository) => {
      const current = await this.countProjectsPerPortfolioCategory(repository);
      assertPortfolioLimits(
        current,
        withProjectMoved(current, null, dto.category),
      );
      return repository.save(
        repository.create({
          ...dto,
          type: ShowcaseItemType.PortfolioProject,
        }),
      );
    });
    await this.deleteUnusedImages();
    return PortfolioProjectResponseDto.fromEntity(project);
  }

  async updatePortfolioProject(
    showcaseItemId: string,
    dto: UpdatePortfolioProjectDto,
  ): Promise<PortfolioProjectResponseDto> {
    this.assertImagesFromUpload([dto.imageUrl, dto.beforeUrl, dto.afterUrl]);
    const saved = await this.withShowcaseLock(async (repository) => {
      const project = await this.findPortfolioProjectOrFail(
        repository,
        showcaseItemId,
      );
      if (dto.category !== undefined && dto.category !== project.category) {
        const current =
          await this.countProjectsPerPortfolioCategory(repository);
        assertPortfolioLimits(
          current,
          withProjectMoved(current, project.category, dto.category),
        );
      }
      Object.assign(project, dto);
      return repository.save(project);
    });
    await this.deleteUnusedImages();
    return PortfolioProjectResponseDto.fromEntity(saved);
  }

  async removePortfolioProject(showcaseItemId: string): Promise<void> {
    await this.withShowcaseLock(async (repository) => {
      const project = await this.findPortfolioProjectOrFail(
        repository,
        showcaseItemId,
      );
      const current = await this.countProjectsPerPortfolioCategory(repository);
      assertPortfolioLimits(
        current,
        withProjectMoved(current, project.category, null),
      );
      await repository.remove(project);
    });
    await this.deleteUnusedImages();
  }

  // Renames the category in all its projects; a name already in use merges
  // both categories.
  async renamePortfolioCategory(
    category: string,
    dto: RenamePortfolioCategoryDto,
  ): Promise<string[]> {
    await this.withShowcaseLock(async (repository) => {
      const current = await this.countProjectsPerPortfolioCategory(repository);
      this.assertPortfolioCategoryExists(current, category);
      // A name not in use only relabels the projects, so only a merge can
      // pass a limit.
      if (current.has(dto.name)) {
        assertPortfolioLimits(
          current,
          withPortfolioCategoryRenamed(current, category, dto.name),
        );
      }
      await repository.update(
        { type: ShowcaseItemType.PortfolioProject, category },
        { category: dto.name },
      );
    });
    return this.findPortfolioCategories();
  }

  // A category exists only through its projects, so removing it removes them.
  async removePortfolioCategory(category: string): Promise<void> {
    await this.withShowcaseLock(async (repository) => {
      const current = await this.countProjectsPerPortfolioCategory(repository);
      this.assertPortfolioCategoryExists(current, category);
      assertPortfolioLimits(
        current,
        withPortfolioCategoryRemoved(current, category),
      );
      await repository.delete({
        type: ShowcaseItemType.PortfolioProject,
        category,
      });
    });
    await this.deleteUnusedImages();
  }

  // The site shows a timeline by the event date; the admin panel lists the
  // newest created event first.
  async findCompanyEvents(
    query: ListCompanyEventsQueryDto,
  ): Promise<CompanyEventResponseDto[]> {
    const events = await this.showcaseItemsRepository.find({
      where: { type: ShowcaseItemType.CompanyEvent },
      order:
        query.orderBy === CompanyEventOrderBy.CreatedAt
          ? { createdAt: 'DESC' }
          : { eventDate: 'DESC', createdAt: 'DESC' },
    });
    return events.map((event) => CompanyEventResponseDto.fromEntity(event));
  }

  async findCompanyEvent(
    showcaseItemId: string,
  ): Promise<CompanyEventResponseDto> {
    return CompanyEventResponseDto.fromEntity(
      await this.findCompanyEventOrFail(
        this.showcaseItemsRepository,
        showcaseItemId,
      ),
    );
  }

  async createCompanyEvent(
    dto: CreateCompanyEventDto,
  ): Promise<CompanyEventResponseDto> {
    this.assertImagesFromUpload([dto.imageUrl]);
    const event = await this.withShowcaseLock(async (repository) => {
      const total = await this.countCompanyEvents(repository);
      assertCompanyEventLimits(total, total + 1);
      return repository.save(
        repository.create({ ...dto, type: ShowcaseItemType.CompanyEvent }),
      );
    });
    await this.deleteUnusedImages();
    return CompanyEventResponseDto.fromEntity(event);
  }

  async updateCompanyEvent(
    showcaseItemId: string,
    dto: UpdateCompanyEventDto,
  ): Promise<CompanyEventResponseDto> {
    this.assertImagesFromUpload([dto.imageUrl]);
    // Inside the lock, an event removed meanwhile gives 404: outside it, save()
    // would insert the removed row again, past the limits.
    const saved = await this.withShowcaseLock(async (repository) => {
      const event = await this.findCompanyEventOrFail(
        repository,
        showcaseItemId,
      );
      Object.assign(event, dto);
      return repository.save(event);
    });
    await this.deleteUnusedImages();
    return CompanyEventResponseDto.fromEntity(saved);
  }

  async removeCompanyEvent(showcaseItemId: string): Promise<void> {
    await this.withShowcaseLock(async (repository) => {
      const event = await this.findCompanyEventOrFail(
        repository,
        showcaseItemId,
      );
      const total = await this.countCompanyEvents(repository);
      assertCompanyEventLimits(total, total - 1);
      await repository.remove(event);
    });
    await this.deleteUnusedImages();
  }

  // Only images sent through the upload route are accepted, so the cleanup
  // knows every picture of the showcase.
  private assertImagesFromUpload(urls: Array<string | null | undefined>): void {
    const hasForeignImage = urls.some(
      (url) =>
        typeof url === 'string' &&
        !this.storageService.isUploadedImageUrl(url, SHOWCASE_IMAGES_FOLDER),
    );
    if (hasForeignImage) {
      throw new BadRequestException(
        'Envie a imagem pela rota de upload e use a URL devolvida.',
      );
    }
  }

  // The limits count rows that other requests may be changing at the same
  // time. Counting and saving in one transaction, behind a lock shared by
  // every limited change, keeps two requests from passing the same limit.
  private withShowcaseLock<Result>(
    change: (repository: Repository<ShowcaseItem>) => Promise<Result>,
  ): Promise<Result> {
    return this.showcaseItemsRepository.manager.transaction(async (manager) => {
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtext('showcase_items'))`,
      );
      return change(manager.getRepository(ShowcaseItem));
    });
  }

  private async countProjectsPerPortfolioCategory(
    repository: Repository<ShowcaseItem>,
  ): Promise<ProjectsPerPortfolioCategory> {
    const projects = await repository.find({
      select: { category: true },
      where: { type: ShowcaseItemType.PortfolioProject },
    });
    const counts: ProjectsPerPortfolioCategory = new Map();
    for (const { category } of projects) {
      if (category !== null) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
    return counts;
  }

  private countCompanyEvents(
    repository: Repository<ShowcaseItem>,
  ): Promise<number> {
    return repository.countBy({ type: ShowcaseItemType.CompanyEvent });
  }

  private assertPortfolioCategoryExists(
    current: ProjectsPerPortfolioCategory,
    category: string,
  ): void {
    if (!current.has(category)) {
      throw new NotFoundException('Categoria não encontrada');
    }
  }

  // Runs after every change, over all the items of the table: it deletes
  // replaced pictures and uploads never saved, but keeps a picture that
  // another item, project or event, still uses. The data is already saved
  // when this runs, so a bucket failure is only logged.
  private async deleteUnusedImages(): Promise<void> {
    try {
      const items = await this.showcaseItemsRepository.find({
        select: { imageUrl: true, beforeUrl: true, afterUrl: true },
      });
      await this.storageService.deleteUnusedImages(
        SHOWCASE_IMAGES_FOLDER,
        items.flatMap((item) => [item.imageUrl, item.beforeUrl, item.afterUrl]),
      );
    } catch (error) {
      this.logger.error('Falha ao apagar imagens sem uso da vitrine', error);
    }
  }

  // Events and projects share the table, so every lookup filters by type.
  private async findPortfolioProjectOrFail(
    repository: Repository<ShowcaseItem>,
    showcaseItemId: string,
  ): Promise<ShowcaseItem> {
    const project = await repository.findOneBy({
      showcaseItemId,
      type: ShowcaseItemType.PortfolioProject,
    });
    if (!project) {
      throw new NotFoundException('Projeto do portfólio não encontrado');
    }
    return project;
  }

  private async findCompanyEventOrFail(
    repository: Repository<ShowcaseItem>,
    showcaseItemId: string,
  ): Promise<ShowcaseItem> {
    const event = await repository.findOneBy({
      showcaseItemId,
      type: ShowcaseItemType.CompanyEvent,
    });
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    return event;
  }
}
