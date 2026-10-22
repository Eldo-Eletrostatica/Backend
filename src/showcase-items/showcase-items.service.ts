import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadedImageDto } from '../site-settings/dto/uploaded-image.dto';
import {
  detectImageFormat,
  isUploadedImageName,
  UNSUPPORTED_IMAGE_MESSAGE,
} from '../site-settings/image-format';
import { StorageService } from '../storage/storage.service';
import { CreatePortfolioProjectDto } from './dto/create-portfolio-project.dto';
import { ListPortfolioProjectsQueryDto } from './dto/list-portfolio-projects-query.dto';
import {
  PaginatedPortfolioProjectsDto,
  PortfolioProjectResponseDto,
} from './dto/portfolio-project-response.dto';
import { UpdatePortfolioProjectDto } from './dto/update-portfolio-project.dto';
import {
  ShowcaseItem,
  ShowcaseItemType,
} from './entities/showcase-item.entity';
import { DEFAULT_PAGE_SIZE } from './showcase-items.constants';

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
      await this.findPortfolioProjectOrFail(showcaseItemId),
    );
  }

  async createPortfolioProject(
    dto: CreatePortfolioProjectDto,
  ): Promise<PortfolioProjectResponseDto> {
    this.assertImagesFromUpload([dto.imageUrl, dto.beforeUrl, dto.afterUrl]);
    const project = this.showcaseItemsRepository.create({
      ...dto,
      type: ShowcaseItemType.PortfolioProject,
    });
    return PortfolioProjectResponseDto.fromEntity(
      await this.showcaseItemsRepository.save(project),
    );
  }

  async updatePortfolioProject(
    showcaseItemId: string,
    dto: UpdatePortfolioProjectDto,
  ): Promise<PortfolioProjectResponseDto> {
    this.assertImagesFromUpload([dto.imageUrl, dto.beforeUrl, dto.afterUrl]);
    const project = await this.findPortfolioProjectOrFail(showcaseItemId);
    const previousUrls = [
      project.imageUrl,
      project.beforeUrl,
      project.afterUrl,
    ];

    Object.assign(project, dto);
    const saved = await this.showcaseItemsRepository.save(project);

    // Pictures that were replaced or removed are deleted only after the save.
    const currentUrls = [saved.imageUrl, saved.beforeUrl, saved.afterUrl];
    await this.deleteImages(
      previousUrls.filter((url) => !currentUrls.includes(url)),
    );
    return PortfolioProjectResponseDto.fromEntity(saved);
  }

  async removePortfolioProject(showcaseItemId: string): Promise<void> {
    const project = await this.findPortfolioProjectOrFail(showcaseItemId);
    const urls = [project.imageUrl, project.beforeUrl, project.afterUrl];
    await this.showcaseItemsRepository.remove(project);
    await this.deleteImages(urls);
  }

  // Only images sent through the upload route are accepted, so every picture
  // of the showcase lives in the bucket.
  private assertImagesFromUpload(urls: Array<string | null | undefined>): void {
    const folderUrl = `${this.storageService.publicUrl}/${SHOWCASE_IMAGES_FOLDER}/`;
    const isUploadedImageUrl = (url: string) =>
      url.startsWith(folderUrl) &&
      isUploadedImageName(url.slice(folderUrl.length));
    const hasForeignImage = urls.some(
      (url) => typeof url === 'string' && !isUploadedImageUrl(url),
    );
    if (hasForeignImage) {
      throw new BadRequestException(
        'Envie a imagem pela rota de upload e use a URL devolvida.',
      );
    }
  }

  // The data is already saved when this runs, so a bucket failure is only
  // logged: it must not turn a successful request into a 500.
  private async deleteImages(
    urls: Array<string | null | undefined>,
  ): Promise<void> {
    const prefix = `${this.storageService.publicUrl}/`;
    const keys = urls
      .filter((url): url is string => typeof url === 'string')
      .filter((url) => url.startsWith(prefix))
      .map((url) => url.slice(prefix.length));
    if (keys.length === 0) {
      return;
    }
    try {
      await this.storageService.deleteMany(keys);
    } catch (error) {
      this.logger.error('Falha ao apagar imagens da vitrine do bucket', error);
    }
  }

  // Vertical timeline of the site: newest event first.
  async findCompanyEvents(): Promise<CompanyEventResponseDto[]> {
    const events = await this.showcaseItemsRepository.find({
      where: { type: ShowcaseItemType.CompanyEvent },
      order: { eventDate: 'DESC', createdAt: 'DESC' },
    });
    return events.map((event) => CompanyEventResponseDto.fromEntity(event));
  }

  async findCompanyEvent(
    showcaseItemId: string,
  ): Promise<CompanyEventResponseDto> {
    return CompanyEventResponseDto.fromEntity(
      await this.findCompanyEventOrFail(showcaseItemId),
    );
  }

  async createCompanyEvent(
    dto: CreateCompanyEventDto,
  ): Promise<CompanyEventResponseDto> {
    const total = await this.showcaseItemsRepository.countBy({
      type: ShowcaseItemType.CompanyEvent,
    });
    if (total >= MAX_COMPANY_EVENTS) {
      throw new BadRequestException(
        `O limite é de ${MAX_COMPANY_EVENTS} eventos`,
      );
    }
    const event = this.showcaseItemsRepository.create({
      ...dto,
      type: ShowcaseItemType.CompanyEvent,
    });
    return CompanyEventResponseDto.fromEntity(
      await this.showcaseItemsRepository.save(event),
    );
  }

  async updateCompanyEvent(
    showcaseItemId: string,
    dto: UpdateCompanyEventDto,
  ): Promise<CompanyEventResponseDto> {
    const event = await this.findCompanyEventOrFail(showcaseItemId);
    Object.assign(event, dto);
    return CompanyEventResponseDto.fromEntity(
      await this.showcaseItemsRepository.save(event),
    );
  }

  async removeCompanyEvent(showcaseItemId: string): Promise<void> {
    const event = await this.findCompanyEventOrFail(showcaseItemId);
    await this.showcaseItemsRepository.remove(event);
  }

  // Projects share the table, so every lookup filters by the event type.
  private async findCompanyEventOrFail(
    showcaseItemId: string,
  ): Promise<ShowcaseItem> {
    const event = await this.showcaseItemsRepository.findOneBy({
      showcaseItemId,
      type: ShowcaseItemType.CompanyEvent,
    });
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    return event;
  }

  // Events share the table, so every lookup filters by the portfolio type.
  private async findPortfolioProjectOrFail(
    showcaseItemId: string,
  ): Promise<ShowcaseItem> {
    const project = await this.showcaseItemsRepository.findOneBy({
      showcaseItemId,
      type: ShowcaseItemType.PortfolioProject,
    });
    if (!project) {
      throw new NotFoundException('Projeto do portfólio não encontrado');
    }
    return project;
  }
}
