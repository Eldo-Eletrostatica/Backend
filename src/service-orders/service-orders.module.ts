import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrder } from './entities/service-order.entity';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { Customer } from '../customers/entities/customer.entity';
import { Employee } from '../employees/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceOrder, Customer, Employee])],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [TypeOrmModule],
})
export class ServiceOrdersModule {}
