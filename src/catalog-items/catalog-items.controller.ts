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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmployeeRole } from '../employees/entities/employee.entity';
import { CatalogItemsService } from './catalog-items.service';
import { CatalogItemResponseDto } from './dto/catalog-item-response.dto';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { ListCatalogItemsQueryDto } from './dto/list-catalog-items-query.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';

// Administration of the price catalog (US08). The public estimator lists only
// the active items, through GET /quotes/estimator.
@ApiTags('catalog-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.Admin)
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
@ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
@Controller('catalog-items')
export class CatalogItemsController {
  constructor(private readonly catalogItemsService: CatalogItemsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os itens do catálogo de preços, ativos e inativos',
  })
  @ApiOkResponse({ type: [CatalogItemResponseDto] })
  findAll(
    @Query() query: ListCatalogItemsQueryDto,
  ): Promise<CatalogItemResponseDto[]> {
    return this.catalogItemsService.findAll(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra um tipo de pintura ou um material da peça',
  })
  @ApiCreatedResponse({ type: CatalogItemResponseDto })
  @ApiBadRequestResponse({
    description: 'Valor negativo, não numérico ou preço que não é do tipo',
  })
  create(@Body() dto: CreateCatalogItemDto): Promise<CatalogItemResponseDto> {
    return this.catalogItemsService.create(dto);
  }

  @Patch(':catalogItemId')
  @ApiOperation({
    summary: 'Altera o nome, o preço ou a ativação de um item',
    description:
      'O preço novo só vale para os orçamentos calculados depois; os antigos mantêm o preço da época.',
  })
  @ApiOkResponse({ type: CatalogItemResponseDto })
  @ApiBadRequestResponse({
    description: 'Valor negativo, não numérico ou preço que não é do tipo',
  })
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  update(
    @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
    @Body() dto: UpdateCatalogItemDto,
  ): Promise<CatalogItemResponseDto> {
    return this.catalogItemsService.update(catalogItemId, dto);
  }

  @Delete(':catalogItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui um item do catálogo' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  remove(
    @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
  ): Promise<void> {
    return this.catalogItemsService.remove(catalogItemId);
  }
}
