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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { InventoryCategoryNameDto } from './dto/inventory-category-name.dto';
import { InventoryCategoryResponseDto } from './dto/inventory-category-response.dto';
import { InventoryCategoriesService } from './inventory-categories.service';

@ApiTags('inventory-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
@Controller('inventory-categories')
export class InventoryCategoriesController {
  constructor(private readonly categoriesService: InventoryCategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as categorias de estoque',
    description:
      'As categorias que o cadastro de itens oferece, em ordem alfabética. Qualquer funcionário consulta.',
  })
  @ApiOkResponse({ type: [InventoryCategoryResponseDto] })
  findAll(): Promise<InventoryCategoryResponseDto[]> {
    return this.categoriesService.findAll();
  }

  @Post()
  @Roles(EmployeeRole.Admin)
  @ApiOperation({ summary: 'Cria uma categoria de estoque (administrador)' })
  @ApiCreatedResponse({ type: InventoryCategoryResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiConflictResponse({ description: 'Já existe uma categoria com esse nome' })
  create(
    @Body() dto: InventoryCategoryNameDto,
  ): Promise<InventoryCategoryResponseDto> {
    return this.categoriesService.create(dto.name);
  }

  @Patch(':inventoryCategoryId')
  @Roles(EmployeeRole.Admin)
  @ApiOperation({
    summary: 'Renomeia uma categoria de estoque (administrador)',
    description: 'Os itens da categoria passam a mostrar o nome novo.',
  })
  @ApiOkResponse({ type: InventoryCategoryResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada' })
  @ApiConflictResponse({ description: 'Já existe uma categoria com esse nome' })
  rename(
    @Param('inventoryCategoryId', ParseUUIDPipe) inventoryCategoryId: string,
    @Body() dto: InventoryCategoryNameDto,
  ): Promise<InventoryCategoryResponseDto> {
    return this.categoriesService.rename(inventoryCategoryId, dto.name);
  }

  @Delete(':inventoryCategoryId')
  @Roles(EmployeeRole.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove uma categoria de estoque (administrador)',
    description:
      'A categoria sai da lista do cadastro, mas os itens que já a usavam continuam mostrando o nome dela.',
  })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada' })
  remove(
    @Param('inventoryCategoryId', ParseUUIDPipe) inventoryCategoryId: string,
  ): Promise<void> {
    return this.categoriesService.remove(inventoryCategoryId);
  }
}
