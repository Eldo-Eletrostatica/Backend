import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogItemsController } from './catalog-items.controller';
import { CatalogItemsService } from './catalog-items.service';
import { CatalogItem } from './entities/catalog-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogItem])],
  controllers: [CatalogItemsController],
  providers: [CatalogItemsService],
  exports: [TypeOrmModule],
})
export class CatalogItemsModule {}
