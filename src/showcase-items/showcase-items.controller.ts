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
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UploadedImageDto } from '../site-settings/dto/uploaded-image.dto';
import { MAX_IMAGE_BYTES } from '../site-settings/image-format';
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

  @Post('images')
  @ApiOperation({
    summary: 'Envia uma imagem da vitrine',
    description:
      'Devolve a URL para salvar no projeto. Aceita PNG, JPEG e WebP até 5 MB.',
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
