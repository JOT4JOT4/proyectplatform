import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
    };

    const mockUsersService = {
      findOrCreate: jest.fn().mockResolvedValue({
        id: 'user-123',
        email: 'test@alumnos.ucn.cl',
        firstName: 'Juan',
        role: 'user',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanExpiredLogins', () => {
    it('should delete expired pending logins but keep active ones', () => {
      const activeCode = service.createLoginCode({
        message: 'Active',
        access_token: 'active-token',
        user: { id: 'u1' },
      });

      const expiredCode = 'expired-uuid-code';
      // Access private map for testing
      (service as any).pendingLogins.set(expiredCode, {
        loginData: {
          message: 'Expired',
          access_token: 'expired-token',
          user: { id: 'u2' },
        },
        expiresAt: Date.now() - 1000,
      });

      expect((service as any).pendingLogins.has(activeCode)).toBe(true);
      expect((service as any).pendingLogins.has(expiredCode)).toBe(true);

      service.cleanExpiredLogins();

      expect((service as any).pendingLogins.has(activeCode)).toBe(true);
      expect((service as any).pendingLogins.has(expiredCode)).toBe(false);
    });
  });
});
