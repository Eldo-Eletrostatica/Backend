import { Module } from '@nestjs/common';
import { CompanyNotifier } from './company-notifier';
import { MailService } from './mail.service';

@Module({
  providers: [MailService, CompanyNotifier],
  exports: [MailService, CompanyNotifier],
})
export class MailModule {}
