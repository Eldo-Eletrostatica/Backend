import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreatePortfolioProjectDto } from './dto/create-portfolio-project.dto';
import { ListPortfolioProjectsQueryDto } from './dto/list-portfolio-projects-query.dto';
import {
  PaginatedPortfolioProjectsDto,
  PortfolioProjectResponseDto,
} from './dto/portfolio-project-response.dto';
import { UpdatePortfolioProjectDto } from './dto/update-portfolio-project.dto';
import { ShowcaseItemsService } from './showcase-items.service';
import { CompanyEventResponseDto } from './dto/company-event-response.dto';
import { CreateCompanyEventDto } from './dto/create-company-event.dto';
import { UpdateCompanyEventDto } from './dto/update-company-event.dto';

@ApiTags('showcase-items')
@Controller('showcase-items')
export class ShowcaseItemsController {
  constructor(private readonly showcaseItemsService: ShowcaseItemsService) {}

  @Get('portfolio-projects')
  @ApiOkResponse({ type: PaginatedPortfolioProjectsDto })
  findPortfolioProjects(@Query() query: ListPortfolioProjectsQueryDto) {
    return this.showcaseItemsService.findPortfolioProjects(query);
  }

  // Declared before ':showcaseItemId' so "categories" is not read as an id.
  @Get('portfolio-projects/categories')
  @ApiOkResponse({ type: [String] })
  findPortfolioCategories() {
    return this.showcaseItemsService.findPortfolioCategories();
  }

  @Get('portfolio-projects/:showcaseItemId')
  @ApiOkResponse({ type: PortfolioProjectResponseDto })
  findPortfolioProject(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
  ) {
    return this.showcaseItemsService.findPortfolioProject(showcaseItemId);
  }

  @Post('portfolio-projects')
  createPortfolioProject(@Body() dto: CreatePortfolioProjectDto) {
    return this.showcaseItemsService.createPortfolioProject(dto);
  }

  @Patch('portfolio-projects/:showcaseItemId')
  updatePortfolioProject(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
    @Body() dto: UpdatePortfolioProjectDto,
  ) {
    return this.showcaseItemsService.updatePortfolioProject(
      showcaseItemId,
      dto,
    );
  }

  @Delete('portfolio-projects/:showcaseItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePortfolioProject(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
  ) {
    return this.showcaseItemsService.removePortfolioProject(showcaseItemId);
  }

  @Get('company-events')
  @ApiOkResponse({ type: [CompanyEventResponseDto] })
  findCompanyEvents() {
    return this.showcaseItemsService.findCompanyEvents();
  }

  @Get('company-events/:showcaseItemId')
  @ApiOkResponse({ type: CompanyEventResponseDto })
  @ApiNotFoundResponse({ description: 'Evento não encontrado' })
  findCompanyEvent(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
  ) {
    return this.showcaseItemsService.findCompanyEvent(showcaseItemId);
  }

  @Post('company-events')
  createCompanyEvent(@Body() dto: CreateCompanyEventDto) {
    return this.showcaseItemsService.createCompanyEvent(dto);
  }

  @Patch('company-events/:showcaseItemId')
  updateCompanyEvent(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
    @Body() dto: UpdateCompanyEventDto,
  ) {
    return this.showcaseItemsService.updateCompanyEvent(showcaseItemId, dto);
  }

  @Delete('company-events/:showcaseItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCompanyEvent(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
  ) {
    return this.showcaseItemsService.removeCompanyEvent(showcaseItemId);
  }
}
