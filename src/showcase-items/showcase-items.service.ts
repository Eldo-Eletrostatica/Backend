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
import {
  DEFAULT_PAGE_SIZE,
  SHOWCASE_IMAGES_FOLDER,
} from './showcase-items.constants';

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
    const project = await this.showcaseItemsRepository.save(
      this.showcaseItemsRepository.create({
        ...dto,
        type: ShowcaseItemType.PortfolioProject,
      }),
    );
    await this.deleteUnusedImages();
    return PortfolioProjectResponseDto.fromEntity(project);
  }

  async updatePortfolioProject(
    showcaseItemId: string,
    dto: UpdatePortfolioProjectDto,
  ): Promise<PortfolioProjectResponseDto> {
    this.assertImagesFromUpload([dto.imageUrl, dto.beforeUrl, dto.afterUrl]);
    const project = await this.findPortfolioProjectOrFail(showcaseItemId);
    Object.assign(project, dto);
    const saved = await this.showcaseItemsRepository.save(project);
    await this.deleteUnusedImages();
    return PortfolioProjectResponseDto.fromEntity(saved);
  }

  async removePortfolioProject(showcaseItemId: string): Promise<void> {
    const project = await this.findPortfolioProjectOrFail(showcaseItemId);
    await this.showcaseItemsRepository.remove(project);
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
