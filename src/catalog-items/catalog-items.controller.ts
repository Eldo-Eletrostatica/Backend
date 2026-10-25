import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CatalogItemsService } from "./catalog-items.service";
import { CreateCatalogItemDto } from "./dto/create-catalog-item.dto";
import { UpdateCatalogItemDto } from "./dto/update-catalog-item.dto";

@ApiTags('catalog-items')
@Controller('catalog-items')
export class CatalogItemsController{
    constructor(private readonly catalogItemsService :CatalogItemsService){}

    @Post('create')
    @ApiOperation({
        summary: 'Cria novo ítem de catálogo'
    })
    @ApiCreatedResponse({
        description: 'Ítem criado com sucesso',
        type: String
    })
    @ApiBadRequestResponse({
        description: 'Dados de ítem de catálogo inválidos'
    })
    @ApiUnauthorizedResponse({
        description: "Não autenticado"
    })
    @ApiForbiddenResponse({
        description: "Acesso restrito à administradores"
    })
    createCatalogItem(@Body() dto: CreateCatalogItemDto): Promise<String>
    {
        return this.catalogItemsService.createCatalogItem(dto);
    }

    @Patch(':catalogItemId/update')
    @ApiOperation({
        description: 'Atualiza ítem de catálogo'
    })
    @ApiOkResponse({
        description: 'Ítem atualizado com sucesso',
        type: String
    })
    @ApiUnauthorizedResponse({
        description: "Não autenticado"
    })
    @ApiForbiddenResponse({
        description: "Acesso restrito à administradores"
    })
    updateCatalogItem(
        @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
        @Body() dto: UpdateCatalogItemDto
    ): Promise<String>
    {
        return this.catalogItemsService.updateCatalogItem(catalogItemId, dto);
    }

    @Patch(':catalogItemId/enable')
    @ApiOperation({
        description: 'Habilita ítem de catálogo'
    })
    @ApiOkResponse({
        description: 'Ítem ativado com sucesso',
        type: Boolean
    })
    @ApiUnauthorizedResponse({
        description: "Não autenticado"
    })
    @ApiForbiddenResponse({
        description: "Acesso restrito à administradores"
    })
    enableCatalogItem(
        @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
    ): Promise<Boolean>
    {
        return this.catalogItemsService.toggleCatalogItem(catalogItemId, true);
    }

    @Patch(':catalogItemId/disable')
    @ApiOperation({
        description: 'Desabilita ítem de catálogo'
    })
    @ApiOkResponse({
        description: 'Ítem desativado com sucesso',
        type: Boolean
    })
    @ApiUnauthorizedResponse({
        description: "Não autenticado"
    })
    @ApiForbiddenResponse({
        description: "Acesso restrito à administradores"
    })
    disableCatalogItem(
        @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
    ): Promise<Boolean>
    {
        return this.catalogItemsService.toggleCatalogItem(catalogItemId, false);
    }


}