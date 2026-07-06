import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const apiKey = this.configService.get<string>('MAIL_PASS') || '';
      const from = this.configService.get<string>('MAIL_FROM') || '"Sistema de Reservas UCN" <noreply@ucn.cl>';

      let fromName = 'Sistema de Reservas UCN';
      let fromEmail = 'noreply@ucn.cl';

      const match = from.match(/^(?:"?([^"]*)"?\s)?(?:<(.+)>)$/);
      if (match) {
        fromName = match[1]?.trim() || fromName;
        fromEmail = match[2]?.trim() || fromEmail;
      } else if (from.includes('@')) {
        fromEmail = from.trim();
        fromName = fromEmail.split('@')[0];
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        } as Record<string, string>,
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail,
          },
          to: [
            {
              email: to,
            },
          ],
          subject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo API responded with status ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as { messageId?: string };
      this.logger.log(`Correo enviado exitosamente a ${to}: ${data.messageId || 'Success'}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando correo a ${to}: ${error.message}`);
      return false;
    }
  }
}

