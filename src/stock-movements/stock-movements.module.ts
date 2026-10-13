import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from './entities/stock-movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement])],
  exports: [TypeOrmModule],
})
export class StockMovementsModule {}
