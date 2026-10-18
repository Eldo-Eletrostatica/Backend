import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowcaseItem } from './entities/showcase-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShowcaseItem])],
  exports: [TypeOrmModule],
})
export class ShowcaseItemsModule {}
