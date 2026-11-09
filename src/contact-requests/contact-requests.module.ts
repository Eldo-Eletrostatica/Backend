import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { OrdersModule } from '../orders/orders.module';
import { ContactRequestsController } from './contact-requests.controller';
import { ContactRequestsService } from './contact-requests.service';
import { MailModule } from '../mail/mail.module';
import { ContactRequestNotifier } from './contact-request-notifier';
import { CaptchaModule } from '../captcha/captcha.module';

// A contact request is the first stage of an order (ADR 0005): this module
// writes orders and the individual customer who sent the form.
@Module({
  imports: [OrdersModule, CustomersModule, MailModule, CaptchaModule],
  controllers: [ContactRequestsController],
  providers: [ContactRequestsService, ContactRequestNotifier],
})
export class ContactRequestsModule {}
