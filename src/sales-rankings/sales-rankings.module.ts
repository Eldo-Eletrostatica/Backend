import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { OrdersModule } from '../orders/orders.module';
import { SalesRankingsController } from './sales-rankings.controller';
import { SalesRankingsService } from './sales-rankings.service';

@Module({
  imports: [OrdersModule, EmployeesModule],
  controllers: [SalesRankingsController],
  providers: [SalesRankingsService],
})
export class SalesRankingsModule {}
