import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { ContactRequestResponseDto } from './dto/contact-request-response.dto';

// (61) 99999-8888 for mobiles and (61) 3333-4444 for landlines.
function formatPhone(digits: string): string {
  const match = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits;
}

// Tells the company about a new contact request (US28). Plain text keeps the
// visitor's message from being read as HTML, and Reply-To lets the team answer
// straight from the email.
@Injectable()
export class ContactRequestNotifier {
  private readonly logger = new Logger(ContactRequestNotifier.name);
  private readonly notificationEmail: string | undefined;

  constructor(
    private readonly mailService: MailService,
    config: ConfigService,
  ) {
    this.notificationEmail =
      config.get<string>('CONTACT_NOTIFICATION_EMAIL') || undefined;
  }

  // Never rejects: the contact is already saved, and a failed email must not
  // change what the visitor sees (US28 criterion 2).
  async notify(contactRequest: ContactRequestResponseDto): Promise<void> {
    if (!this.notificationEmail) return;
    try {
      await this.mailService.send({
        to: this.notificationEmail,
        replyTo: contactRequest.email,
        subject: `Novo contato pelo site: ${contactRequest.name}`,
        text: [
          'Chegou um novo contato pelo formulário do site.',
          '',
          `Nome: ${contactRequest.name}`,
          `Telefone: ${formatPhone(contactRequest.phone)}`,
          `E-mail: ${contactRequest.email}`,
          '',
          'Mensagem:',
          contactRequest.message,
          '',
          'Responda a este e-mail para falar com o visitante, e marque o contato como atendido na área interna.',
        ].join('\n'),
      });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar o aviso do contato ${contactRequest.orderId}`,
        error,
      );
    }
  }
}
