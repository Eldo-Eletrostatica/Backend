import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { OrdersModule } from '../orders/orders.module';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';

@Module({
  imports: [OrdersModule, EmployeesModule],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
