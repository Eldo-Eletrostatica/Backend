import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryCategory } from '../inventory-categories/entities/inventory-category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryItemsService } from './inventory-items.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryItem, InventoryCategory, Supplier]),
  ],
  controllers: [InventoryItemsController],
  providers: [InventoryItemsService],
  exports: [TypeOrmModule],
})
export class InventoryItemsModule {}
