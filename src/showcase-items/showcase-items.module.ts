import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowcaseItem } from './entities/showcase-item.entity';
import { ShowcaseItemsController } from './showcase-items.controller';
import { ShowcaseItemsService } from './showcase-items.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShowcaseItem])],
  exports: [TypeOrmModule],
  controllers: [ShowcaseItemsController],
  providers: [ShowcaseItemsService],
})
export class ShowcaseItemsModule {}
