import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaintType } from './entities/paint-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaintType])],
  exports: [TypeOrmModule],
})
export class PaintTypesModule {}
