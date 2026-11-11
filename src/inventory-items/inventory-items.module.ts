import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCategoriesModule } from '../inventory-categories/inventory-categories.module';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryItemsService } from './inventory-items.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryItem]),
    InventoryCategoriesModule,
  ],
  controllers: [InventoryItemsController],
  providers: [InventoryItemsService],
  exports: [TypeOrmModule],
})
export class InventoryItemsModule {}
