import { Module } from '@nestjs/common';
import { CatalogItemsModule } from '../catalog-items/catalog-items.module';
import { CustomersModule } from '../customers/customers.module';
import { EmployeesModule } from '../employees/employees.module';
import { OrdersModule } from '../orders/orders.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

// The service writes through a single DataSource transaction; the imports
// declare the entities it reads and writes.
@Module({
  imports: [OrdersModule, CustomersModule, EmployeesModule, CatalogItemsModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
