import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { InventoryItemsModule } from '../inventory-items/inventory-items.module';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';

// Balance and movement are written in one transaction. The imports declare
// the other entities this module reads.
@Module({
  imports: [
    TypeOrmModule.forFeature([StockMovement]),
    InventoryItemsModule,
    EmployeesModule,
  ],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [TypeOrmModule],
})
export class StockMovementsModule {}
