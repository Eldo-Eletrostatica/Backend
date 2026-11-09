import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface PlainTextEmail {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
}

// Sends email by SMTP. In production each client uses its own email account
// (SMTP_*), the same way it uses its own R2 bucket (ADR 0006); development
// and tests use Mailpit from the docker compose.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string | undefined;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    this.from = config.get<string>('SMTP_FROM');
    this.transporter = host
      ? createTransport({
          host,
          port: Number(config.get<string>('SMTP_PORT') ?? 587),
          auth: user
            ? { user, pass: config.get<string>('SMTP_PASSWORD') }
            : undefined,
        })
      : null;
    if (!this.transporter) {
      this.logger.warn('SMTP_HOST not set; emails will not be sent');
    }
  }

  async send(email: PlainTextEmail): Promise<void> {
    if (!this.transporter) return;
    await this.transporter.sendMail({ from: this.from, ...email });
  }
}
