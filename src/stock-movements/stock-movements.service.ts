import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity';
import {
  StockMovement,
  StockMovementType,
} from './entities/stock-movement.entity';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { FindStockMovementsQueryDto } from './dto/find-stock-movements-query.dto';
import type { StockMovementResponseDto } from './dto/stock-movement-response.dto';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  create(input: CreateStockMovementDto) {
    const inventoryItemId = this.requiredString(
      input.inventoryItemId,
      'inventoryItemId',
    );
    const employeeId = this.requiredString(input.employeeId, 'employeeId');
    const type = input.type;
    if (!Object.values(StockMovementType).includes(type)) {
      throw new BadRequestException('Tipo de movimentação inválido');
    }
    const quantity = Number(input.quantity);
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      Math.round(quantity * 1000) !== quantity * 1000
    ) {
      throw new BadRequestException(
        'Quantidade deve ser positiva e ter até três casas decimais',
      );
    }
    const reason = this.requiredString(input.reason, 'reason');

    return this.dataSource.transaction(async (manager) => {
      const item = await manager
        .getRepository(InventoryItem)
        .createQueryBuilder('item')
        .setLock('pessimistic_write')
        .where('item.inventory_item_id = :inventoryItemId', { inventoryItemId })
        .andWhere('item.deleted_at IS NULL')
        .getOne();
      if (!item) throw new NotFoundException('Item não encontrado');
      const employee = await manager
        .getRepository(Employee)
        .findOneBy({ employeeId });
      if (!employee) throw new NotFoundException('Funcionário não encontrado');

      const newBalance =
        type === StockMovementType.Inbound
          ? item.balance + quantity
          : item.balance - quantity;
      if (newBalance < 0) throw new ConflictException('Saldo insuficiente');

      item.balance = Math.round(newBalance * 1000) / 1000;
      await manager.getRepository(InventoryItem).save(item);
      return manager.getRepository(StockMovement).save(
        this.stockMovementRepository.create({
          inventoryItemId,
          employeeId,
          type: type,
          quantity,
          reason,
          movedAt: new Date(),
        }),
      );
    });
  }

  async findByPeriod(
    query: FindStockMovementsQueryDto,
  ): Promise<StockMovementResponseDto[]> {
    const from = this.parseDate(query.from, 'from');
    const to = this.parseDate(query.to, 'to');
    if (from > to)
      throw new BadRequestException('O início deve ser anterior ao fim');
    const builder = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.inventoryItem', 'item')
      .leftJoin('movement.employee', 'employee')
      .addSelect(['employee.employeeId', 'employee.name'])
      .where('movement.moved_at >= :from', { from })
      .andWhere('movement.moved_at < :to', {
        to: new Date(to.getTime() + 24 * 60 * 60 * 1000),
      })
      .orderBy('movement.moved_at', 'DESC');
    if (query.inventoryItemId)
      builder.andWhere('movement.inventory_item_id = :inventoryItemId', {
        inventoryItemId: query.inventoryItemId,
      });
    const movements = await builder.getMany();
    return movements.map((movement) => ({
      stockMovementId: movement.stockMovementId,
      inventoryItemId: movement.inventoryItemId,
      employeeId: movement.employeeId,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      movedAt: movement.movedAt,
      inventoryItem: {
        inventoryItemId: movement.inventoryItem.inventoryItemId,
        name: movement.inventoryItem.name,
        unit: movement.inventoryItem.unit,
      },
      employee: {
        employeeId: movement.employee.employeeId,
        name: movement.employee.name,
      },
    }));
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0)
      throw new BadRequestException(`${field} é obrigatório`);
    return value.trim();
  }

  private parseDate(value: string | undefined, field: string) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new BadRequestException(
        `${field} deve estar no formato AAAA-MM-DD`,
      );
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    )
      throw new BadRequestException(`${field} inválido`);
    return date;
  }
}
