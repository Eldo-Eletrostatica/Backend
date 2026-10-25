import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmployeeRole } from '../employees/entities/employee.entity';
import { UploadedImageDto } from '../storage/dto/uploaded-image.dto';
import { MAX_IMAGE_BYTES } from '../storage/image-format';
import { CompanyEventResponseDto } from './dto/company-event-response.dto';
import { CreateCompanyEventDto } from './dto/create-company-event.dto';
import { CreatePortfolioProjectDto } from './dto/create-portfolio-project.dto';
import { ListCompanyEventsQueryDto } from './dto/list-company-events-query.dto';
import { ListPortfolioProjectsQueryDto } from './dto/list-portfolio-projects-query.dto';
import {
  PaginatedPortfolioProjectsDto,
  PortfolioProjectResponseDto,
} from './dto/portfolio-project-response.dto';
import { RenamePortfolioCategoryDto } from './dto/rename-portfolio-category.dto';
import { UpdateCompanyEventDto } from './dto/update-company-event.dto';
import { UpdatePortfolioProjectDto } from './dto/update-portfolio-project.dto';
import { ShowcaseItemsService } from './showcase-items.service';

@ApiTags('showcase-items')
@Controller('showcase-items')
export class ShowcaseItemsController {
  constructor(private readonly showcaseItemsService: ShowcaseItemsService) {}

  @Post('images')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiOperation({
    summary: 'Envia uma imagem da vitrine',
    description:
      'Devolve a URL para salvar no projeto ou no evento. Aceita PNG, JPEG e WebP até 5 MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: UploadedImageDto })
  @ApiBadRequestResponse({ description: 'Sem arquivo ou formato não aceito' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiPayloadTooLargeResponse({ description: 'Imagem acima de 5 MB' })
  // Multer already rejects a file that reaches the limit, hence the extra byte.
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES + 1 } }),
  )
  uploadShowcaseImage(
    @UploadedFile(new ParseFilePipe()) file: Express.Multer.File,
  ): Promise<UploadedImageDto> {
    return this.showcaseItemsService.uploadShowcaseImage(file.buffer);
  }

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

  @Patch('portfolio-projects/categories/:category')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiOperation({
    summary: 'Renomeia a categoria em todos os projetos dela',
    description:
      'Um nome que já existe junta as duas categorias. Devolve as categorias.',
  })
  @ApiOkResponse({ type: [String] })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada' })
  @ApiConflictResponse({ description: 'Limite de projetos ou de categorias' })
  renamePortfolioCategory(
    @Param('category') category: string,
    @Body() dto: RenamePortfolioCategoryDto,
  ) {
    return this.showcaseItemsService.renamePortfolioCategory(category, dto);
  }

  @Delete('portfolio-projects/categories/:category')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a categoria junto com todos os projetos dela',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada' })
  @ApiConflictResponse({ description: 'Mínimo de categorias' })
  removePortfolioCategory(@Param('category') category: string) {
    return this.showcaseItemsService.removePortfolioCategory(category);
  }

  @Get('portfolio-projects/:showcaseItemId')
  @ApiOkResponse({ type: PortfolioProjectResponseDto })
  @ApiBadRequestResponse({ description: 'O id não é um UUID válido' })
  @ApiNotFoundResponse({ description: 'Projeto do portfólio não encontrado' })
  findPortfolioProject(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
  ) {
    return this.showcaseItemsService.findPortfolioProject(showcaseItemId);
  }

  @Post('portfolio-projects')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiCreatedResponse({ type: PortfolioProjectResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiConflictResponse({ description: 'Limite de projetos ou de categorias' })
  createPortfolioProject(@Body() dto: CreatePortfolioProjectDto) {
    return this.showcaseItemsService.createPortfolioProject(dto);
  }

  @Patch('portfolio-projects/:showcaseItemId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiOkResponse({ type: PortfolioProjectResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Projeto do portfólio não encontrado' })
  @ApiConflictResponse({ description: 'Limite de projetos ou de categorias' })
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Projeto do portfólio não encontrado' })
  @ApiConflictResponse({ description: 'Mínimo de categorias' })
  removePortfolioProject(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
  ) {
    return this.showcaseItemsService.removePortfolioProject(showcaseItemId);
  }

  @Get('company-events')
  @ApiOkResponse({ type: [CompanyEventResponseDto] })
  findCompanyEvents(@Query() query: ListCompanyEventsQueryDto) {
    return this.showcaseItemsService.findCompanyEvents(query);
  }

  @Get('company-events/:showcaseItemId')
  @ApiOkResponse({ type: CompanyEventResponseDto })
  @ApiBadRequestResponse({ description: 'O id não é um UUID válido' })
  @ApiNotFoundResponse({ description: 'Evento não encontrado' })
  findCompanyEvent(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
  ) {
    return this.showcaseItemsService.findCompanyEvent(showcaseItemId);
  }

  @Post('company-events')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiCreatedResponse({ type: CompanyEventResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiConflictResponse({ description: 'Máximo de eventos' })
  createCompanyEvent(@Body() dto: CreateCompanyEventDto) {
    return this.showcaseItemsService.createCompanyEvent(dto);
  }

  @Patch('company-events/:showcaseItemId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiOkResponse({ type: CompanyEventResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Evento não encontrado' })
  updateCompanyEvent(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
    @Body() dto: UpdateCompanyEventDto,
  ) {
    return this.showcaseItemsService.updateCompanyEvent(showcaseItemId, dto);
  }

  @Delete('company-events/:showcaseItemId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiConflictResponse({ description: 'Mínimo de eventos' })
  @ApiNotFoundResponse({ description: 'Evento não encontrado' })
  removeCompanyEvent(
    @Param('showcaseItemId', ParseUUIDPipe) showcaseItemId: string,
  ) {
    return this.showcaseItemsService.removeCompanyEvent(showcaseItemId);
  }
}
