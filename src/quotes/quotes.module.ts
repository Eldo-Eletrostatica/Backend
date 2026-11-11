import { Module } from '@nestjs/common';
import { CatalogItemsModule } from '../catalog-items/catalog-items.module';
import { CustomersModule } from '../customers/customers.module';
import { OrdersModule } from '../orders/orders.module';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { StorageModule } from '../storage/storage.module';
import { QuoteReviewController } from './quote-review.controller';
import { QuoteReviewService } from './quote-review.service';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { MailModule } from '../mail/mail.module';
import { QuoteNotifier } from './quote-notifier';
import { CaptchaModule } from '../captcha/captcha.module';

// A quote is a stage of the order (ADR 0005): this module writes orders,
// order items and customers, and reads the catalog and the estimator settings.
// The public form creates the quote; the team then works it (QuoteReviewService).
@Module({
  imports: [
    OrdersModule,
    CustomersModule,
    CatalogItemsModule,
    SiteSettingsModule,
    StorageModule,
    MailModule,
    CaptchaModule,
  ],
  controllers: [QuotesController, QuoteReviewController],
  providers: [QuotesService, QuoteReviewService, QuoteNotifier],
})
export class QuotesModule {}
