import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  MAX_COMPANY_EVENTS,
} from './showcase-items.constants';
import { CreateCompanyEventDto } from './dto/create-company-event.dto';
import { UpdateCompanyEventDto } from './dto/update-company-event.dto';
import { CompanyEventResponseDto } from './dto/company-event-response.dto';

@Injectable()
export class ShowcaseItemsService {
  constructor(
    @InjectRepository(ShowcaseItem)
    private readonly showcaseItemsRepository: Repository<ShowcaseItem>,
  ) {}

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
    const project = await this.findPortfolioProjectOrFail(showcaseItemId);
    Object.assign(project, dto);
    return PortfolioProjectResponseDto.fromEntity(
      await this.showcaseItemsRepository.save(project),
    );
  }

  async removePortfolioProject(showcaseItemId: string): Promise<void> {
    const project = await this.findPortfolioProjectOrFail(showcaseItemId);
    await this.showcaseItemsRepository.remove(project);
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
