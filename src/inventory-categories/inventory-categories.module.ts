import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCategory } from './entities/inventory-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryCategory])],
  exports: [TypeOrmModule],
})
export class InventoryCategoriesModule {}
