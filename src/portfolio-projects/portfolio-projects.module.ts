import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioProject } from './entities/portfolio-project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioProject])],
  exports: [TypeOrmModule],
})
export class PortfolioProjectsModule {}
