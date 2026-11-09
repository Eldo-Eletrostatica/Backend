import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FixedWindowCounter } from '../common/fixed-window-counter';
import { MailService, PlainTextEmail } from './mail.service';

// A ceiling for the company's inbox, shared by contact and quote notices: past
// it, new requests are still saved and listed in the internal area, but
// without an email. It holds even against a flood spread over many IPs, which
// the per-IP form limit does not stop.
export const MAX_COMPANY_NOTIFICATIONS_PER_HOUR = 20;
const NOTIFICATION_WINDOW_MS = 60 * 60 * 1000;
const NOTIFICATION_KEY = 'company-notifications';

export type CompanyNotification = Omit<PlainTextEmail, 'to'>;

// Sends notices to the company's address (NOTIFICATION_EMAIL). Plain text keeps
// what visitors typed from being read as HTML, and Reply-To lets the team
// answer straight from the email.
@Injectable()
export class CompanyNotifier {
  private readonly logger = new Logger(CompanyNotifier.name);
  private readonly notificationEmail: string | undefined;
  private readonly notificationsSent = new FixedWindowCounter(
    NOTIFICATION_WINDOW_MS,
  );

  constructor(
    private readonly mailService: MailService,
    config: ConfigService,
  ) {
    this.notificationEmail =
      config.get<string>('NOTIFICATION_EMAIL') || undefined;
  }

  // Never rejects: the request is already saved, and a failed email must not
  // change what the visitor sees (US28 criterion 2). The record names the
  // request in the log.
  async notify(
    notification: CompanyNotification,
    record: string,
  ): Promise<void> {
    if (!this.notificationEmail) return;
    if (
      this.notificationsSent.count(NOTIFICATION_KEY) >=
      MAX_COMPANY_NOTIFICATIONS_PER_HOUR
    ) {
      this.logger.warn(
        `Limite de ${MAX_COMPANY_NOTIFICATIONS_PER_HOUR} avisos por hora atingido; ${record} fica só na área interna`,
      );
      return;
    }
    this.notificationsSent.increment(NOTIFICATION_KEY);
    try {
      await this.mailService.send({
        to: this.notificationEmail,
        ...notification,
      });
    } catch (error) {
      this.logger.error(`Falha ao enviar o aviso de ${record}`, error);
    }
  }
}
