import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let mockSendMail: jest.Mock;

  beforeEach(async () => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: '12345' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MAIL_HOST') return 'localhost';
              if (key === 'MAIL_PORT') return 2525;
              if (key === 'MAIL_USER') return 'user';
              if (key === 'MAIL_PASS') return 'pass';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send an email successfully', async () => {
    const result = await service.sendMail('test@example.com', 'Subject', '<p>Test</p>');
    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: '"Sistema de Reservas UCN" <noreply@ucn.cl>',
      to: 'test@example.com',
      subject: 'Subject',
      html: '<p>Test</p>',
    });
  });

  it('should return false if sending email fails', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP Error'));
    const result = await service.sendMail('test@example.com', 'Subject', '<p>Test</p>');
    expect(result).toBe(false);
  });
});
