import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity';
import { Employee } from '../employees/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement, InventoryItem, Employee])],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [TypeOrmModule],
})
export class StockMovementsModule {}
