import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST') || 'sandbox.smtp.mailtrap.io';
    const port = this.configService.get<number>('MAIL_PORT') || 2525;
    const user = this.configService.get<string>('MAIL_USER') || 'your_mailtrap_user_id';
    const pass = this.configService.get<string>('MAIL_PASS') || 'your_mailtrap_password';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: '"Sistema de Reservas UCN" <noreply@ucn.cl>',
        to,
        subject,
        html,
      });
      this.logger.log(`Correo enviado exitosamente a ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando correo a ${to}: ${error.message}`);
      return false;
    }
  }
}
