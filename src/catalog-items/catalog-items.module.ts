import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogItem } from './entities/catalog-item.entity';
import { CatalogItemsController } from './catalog-items.controller';
import { CatalogItemsService } from './catalog-items.service';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogItem])],
  controllers: [CatalogItemsController],
  providers: [CatalogItemsService],
  exports: [CatalogItemsService],
})
export class CatalogItemsModule {}
