import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartMaterial } from './entities/part-material.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PartMaterial])],
  exports: [TypeOrmModule],
})
export class PartMaterialsModule {}
