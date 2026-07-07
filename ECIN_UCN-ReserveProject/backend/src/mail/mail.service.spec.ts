import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

describe('MailService', () => {
  let service: MailService;
  let mockFetch: jest.Mock;

  beforeEach(async () => {
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ messageId: '12345' }),
    });
    global.fetch = mockFetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MAIL_PASS') return 'brevo-api-key';
              if (key === 'MAIL_FROM') return '"Sistema de Reservas UCN" <noreply@ucn.cl>';
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
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }),
    );
  });

  it('should return false if sending email fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('API Error'),
    });
    const result = await service.sendMail('test@example.com', 'Subject', '<p>Test</p>');
    expect(result).toBe(false);
  });
});
