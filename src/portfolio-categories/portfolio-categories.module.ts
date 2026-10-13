import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioCategory } from './entities/portfolio-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioCategory])],
  exports: [TypeOrmModule],
})
export class PortfolioCategoriesModule {}
