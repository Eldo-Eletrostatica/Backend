import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { ShowcaseItem } from './entities/showcase-item.entity';
import { ShowcaseItemsController } from './showcase-items.controller';
import { ShowcaseItemsService } from './showcase-items.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShowcaseItem]), StorageModule],
  exports: [TypeOrmModule],
  controllers: [ShowcaseItemsController],
  providers: [ShowcaseItemsService],
})
export class ShowcaseItemsModule {}
