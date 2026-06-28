import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserPenalty } from './entities/user-penalty.entity';
import { UserWarning } from './entities/user-warning.entity';
import { MailService } from '../mail/mail.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let penaltiesRepository: jest.Mocked<Repository<UserPenalty>>;
  let warningsRepository: jest.Mocked<Repository<UserWarning>>;
  let mailService: jest.Mocked<MailService>;

  const mockUser: User = {
    id: 'user-id-123',
    email: 'test@alumnos.ucn.cl',
    firstName: 'Juan',
    lastName: 'Perez',
    picture: null,
    role: null,
    reservations: [],
    penalties: [],
    warnings: [],
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const createMockRepo = () => ({
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      count: jest.fn().mockResolvedValue(0),
    });

    const mockMail = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(UserPenalty),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(UserWarning),
          useValue: createMockRepo(),
        },
        {
          provide: MailService,
          useValue: mockMail,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    penaltiesRepository = module.get(getRepositoryToken(UserPenalty));
    warningsRepository = module.get(getRepositoryToken(UserWarning));
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreate', () => {
    it('should return existing user if found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      const result = await service.findOrCreate({ email: 'test@alumnos.ucn.cl' });
      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@alumnos.ucn.cl' } });
    });

    it('should create and save a new user if not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);
      (usersRepository.save as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOrCreate(mockUser);
      expect(result).toEqual(mockUser);
      expect(usersRepository.create).toHaveBeenCalledWith(mockUser);
      expect(usersRepository.save).toHaveBeenCalled();
    });
  });

  describe('createPenalty', () => {
    it('should create a penalty and notify user via email', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      const penaltyData = { startDate: '2026-06-28', endDate: '2026-07-05', reason: 'Test Reason' };

      const result = await service.createPenalty(mockUser.id, penaltyData);
      expect(result).toBeDefined();
      expect(result.reason).toBe(penaltyData.reason);
      expect(penaltiesRepository.save).toHaveBeenCalled();
      expect(mailService.sendMail).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.createPenalty('invalid-id', { startDate: '', endDate: '', reason: '' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('createWarning', () => {
    it('should create a warning and notify user', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (warningsRepository.count as jest.Mock).mockResolvedValue(2);

      const warning = await service.createWarning(mockUser.id, 'Late cancellation', 3);
      expect(warning).toBeDefined();
      expect(warning.reason).toBe('Late cancellation');
      expect(warningsRepository.save).toHaveBeenCalled();
      expect(mailService.sendMail).toHaveBeenCalled();
      expect(penaltiesRepository.save).not.toHaveBeenCalled();
    });

    it('should trigger automatic 7-day penalty if warning limit is exceeded', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (warningsRepository.count as jest.Mock).mockResolvedValue(4);

      const warning = await service.createWarning(mockUser.id, 'Late cancellation', 3);
      expect(warning).toBeDefined();
      expect(penaltiesRepository.save).toHaveBeenCalled();
      expect(mailService.sendMail).toHaveBeenCalledTimes(2);
    });
  });
});
