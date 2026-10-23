import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { toBrasiliaPeriod } from '../common/brasilia-day';
import { MAX_STOCK_QUANTITY } from '../database/columns';
import { Employee } from '../employees/entities/employee.entity';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { FindStockMovementsQueryDto } from './dto/find-stock-movements-query.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import {
  StockMovement,
  StockMovementType,
} from './entities/stock-movement.entity';

const STOCK_QUANTITY_SCALE = 1000;

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly stockMovements: Repository<StockMovement>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  create(input: CreateStockMovementDto): Promise<StockMovement> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager
        .getRepository(InventoryItem)
        .createQueryBuilder('item')
        .setLock('pessimistic_write')
        .where('item.inventory_item_id = :inventoryItemId', {
          inventoryItemId: input.inventoryItemId,
        })
        .andWhere('item.deleted_at IS NULL')
        .getOne();
      if (item === null) {
        throw new NotFoundException('Item não encontrado.');
      }
      const employee = await manager.findOne(Employee, {
        where: { employeeId: input.employeeId },
      });
      if (employee === null) {
        throw new NotFoundException('Funcionário não encontrado.');
      }

      const newBalance = this.roundQuantity(
        input.type === StockMovementType.Inbound
          ? item.balance + input.quantity
          : item.balance - input.quantity,
      );
      if (newBalance < 0) {
        throw new ConflictException('Saldo insuficiente.');
      }
      if (newBalance > MAX_STOCK_QUANTITY) {
        throw new ConflictException('Saldo máximo excedido.');
      }

      item.balance = newBalance;
      await manager.getRepository(InventoryItem).save(item);
      return manager.getRepository(StockMovement).save(
        this.stockMovements.create({
          inventoryItemId: input.inventoryItemId,
          employeeId: input.employeeId,
          type: input.type,
          quantity: input.quantity,
          reason: input.reason,
          movedAt: new Date(),
        }),
      );
    });
  }

  async findByPeriod(
    query: FindStockMovementsQueryDto,
  ): Promise<StockMovementResponseDto[]> {
    const { start, end } = toBrasiliaPeriod(query.from, query.to);

    const builder = this.stockMovements
      .createQueryBuilder('movement')
      .withDeleted()
      .leftJoinAndSelect('movement.inventoryItem', 'item')
      .leftJoin('movement.employee', 'employee')
      .addSelect(['employee.employeeId', 'employee.name'])
      .where('movement.moved_at >= :start', { start })
      .andWhere('movement.moved_at <= :end', { end })
      .orderBy('movement.moved_at', 'DESC');
    if (query.inventoryItemId !== undefined) {
      builder.andWhere('movement.inventory_item_id = :inventoryItemId', {
        inventoryItemId: query.inventoryItemId,
      });
    }
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

  private roundQuantity(value: number): number {
    return Math.round(value * STOCK_QUANTITY_SCALE) / STOCK_QUANTITY_SCALE;
  }
}
