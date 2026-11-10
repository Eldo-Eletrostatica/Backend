import { Injectable } from '@nestjs/common';
import { CompanyNotifier } from '../mail/company-notifier';
import { formatPhone } from '../mail/notification-format';
import { ContactRequestResponseDto } from './dto/contact-request-response.dto';

// Tells the company about a new contact request (US28).
@Injectable()
export class ContactRequestNotifier {
  constructor(private readonly companyNotifier: CompanyNotifier) {}

  notify(contactRequest: ContactRequestResponseDto): Promise<void> {
    return this.companyNotifier.notify(
      {
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
      },
      `o contato ${contactRequest.orderId}`,
    );
  }
}
