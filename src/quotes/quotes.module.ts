import { Module } from '@nestjs/common';
import { CatalogItemsModule } from '../catalog-items/catalog-items.module';
import { CustomersModule } from '../customers/customers.module';
import { OrdersModule } from '../orders/orders.module';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { StorageModule } from '../storage/storage.module';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

// A quote is a stage of the order (ADR 0005): this module writes orders,
// order items and customers, and reads the catalog and the estimator settings.
@Module({
  imports: [
    OrdersModule,
    CustomersModule,
    CatalogItemsModule,
    SiteSettingsModule,
    StorageModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
