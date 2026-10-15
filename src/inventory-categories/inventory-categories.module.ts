import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCategory } from './entities/inventory-category.entity';
import { InventoryCategoriesController } from './inventory-categories.controller';
import { InventoryCategoriesService } from './inventory-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryCategory])],
  controllers: [InventoryCategoriesController],
  providers: [InventoryCategoriesService],
  exports: [TypeOrmModule],
})
export class InventoryCategoriesModule {}
