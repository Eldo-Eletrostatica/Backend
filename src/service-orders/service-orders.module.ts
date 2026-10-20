import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { OrdersModule } from '../orders/orders.module';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';

// A service order is a stage of the order (ADR 0005). The sale launch creates
// it; this module lists, moves and publishes that stage.
@Module({
  imports: [OrdersModule, CustomersModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
