import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CatalogItemsService } from './catalog-items.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';

@ApiTags('catalog-items')
@Controller('catalog-items')
export class CatalogItemsController {
  constructor(private readonly catalogItemsService: CatalogItemsService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Cria novo item de catálogo',
  })
  @ApiCreatedResponse({
    description: 'Item criado com sucesso',
    type: String,
  })
  @ApiBadRequestResponse({
    description: 'Dados de item de catálogo inválidos',
  })
  @ApiUnauthorizedResponse({
    description: 'Não autenticado',
  })
  @ApiForbiddenResponse({
    description: 'Acesso restrito à administradores',
  })
  createCatalogItem(@Body() dto: CreateCatalogItemDto): Promise<string> {
    return this.catalogItemsService.createCatalogItem(dto);
  }

  @Patch(':catalogItemId/update')
  @ApiOperation({
    description: 'Atualiza item de catálogo',
  })
  @ApiOkResponse({
    description: 'Item atualizado com sucesso',
    type: String,
  })
  @ApiUnauthorizedResponse({
    description: 'Não autenticado',
  })
  @ApiForbiddenResponse({
    description: 'Acesso restrito à administradores',
  })
  updateCatalogItem(
    @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
    @Body() dto: UpdateCatalogItemDto,
  ): Promise<string> {
    return this.catalogItemsService.updateCatalogItem(catalogItemId, dto);
  }

  @Patch(':catalogItemId/enable')
  @ApiOperation({
    description: 'Habilita item de catálogo',
  })
  @ApiOkResponse({
    description: 'Item ativado com sucesso',
    type: Boolean,
  })
  @ApiUnauthorizedResponse({
    description: 'Não autenticado',
  })
  @ApiForbiddenResponse({
    description: 'Acesso restrito à administradores',
  })
  enableCatalogItem(
    @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
  ): Promise<boolean> {
    return this.catalogItemsService.toggleCatalogItem(catalogItemId, true);
  }

  @Patch(':catalogItemId/disable')
  @ApiOperation({
    summary: 'Desabilita item de catálogo',
  })
  @ApiOkResponse({
    description: 'Item desativado com sucesso',
    type: Boolean,
  })
  @ApiUnauthorizedResponse({
    description: 'Não autenticado',
  })
  @ApiForbiddenResponse({
    description: 'Acesso restrito à administradores',
  })
  disableCatalogItem(
    @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
  ): Promise<boolean> {
    return this.catalogItemsService.toggleCatalogItem(catalogItemId, false);
  }

  @Delete(':catalogItemId/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deleta um item de catálogo',
  })
  @ApiNoContentResponse({
    description: 'Item removido com sucesso',
    type: String,
  })
  @ApiUnauthorizedResponse({
    description: 'Não autenticado',
  })
  @ApiForbiddenResponse({
    description: 'Acesso restrito à administradores',
  })
  deleteCatalogItem(
    @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
  ): Promise<string> {
    return this.catalogItemsService.deleteCatalogItem(catalogItemId);
  }
}
