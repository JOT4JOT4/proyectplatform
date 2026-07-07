import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { SpaceBlock } from './entities/space-block.entity';
import { BlockConfig } from './entities/block-config.entity';
import { AdminSetting } from './entities/admin-setting.entity';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { Space } from '../spaces/entities/space.entity';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationRepository: jest.Mocked<Repository<Reservation>>;
  let spaceBlockRepository: jest.Mocked<Repository<SpaceBlock>>;
  let blockConfigRepository: jest.Mocked<Repository<BlockConfig>>;
  let adminSettingRepository: jest.Mocked<Repository<AdminSetting>>;
  let usersService: jest.Mocked<UsersService>;
  let mailService: jest.Mocked<MailService>;

  const mockUser = { id: 'user-id-123', email: 'user@alumnos.ucn.cl', firstName: 'Diego', lastName: 'A' };
  const mockSpace = { id: 'space-id-123', name: 'EIC 101', zone: 'Escuela' };

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const createMockRepo = () => ({
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      count: jest.fn().mockResolvedValue(0),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
      manager: {
        findOne: jest.fn().mockResolvedValue(mockSpace),
        transaction: jest.fn().mockImplementation((cb) => cb({
          findOne: jest.fn().mockResolvedValue(mockSpace),
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getOne: jest.fn(),
            getMany: jest.fn().mockResolvedValue([]),
          }),
          create: jest.fn().mockImplementation((entityClass, dto) => dto),
          save: jest.fn().mockImplementation((entityClass, entity) => Promise.resolve(entity)),
        })),
      },
    });

    const mockUsersService = {
      findOne: jest.fn().mockResolvedValue(mockUser),
      getPenalties: jest.fn().mockResolvedValue([]),
      createWarning: jest.fn(),
      createPenalty: jest.fn(),
      getWeeklyReservationLimit: jest.fn().mockResolvedValue(3),
    };

    const mockMailService = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(SpaceBlock),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(BlockConfig),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(AdminSetting),
          useValue: createMockRepo(),
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    reservationRepository = module.get(getRepositoryToken(Reservation));
    spaceBlockRepository = module.get(getRepositoryToken(SpaceBlock));
    blockConfigRepository = module.get(getRepositoryToken(BlockConfig));
    adminSettingRepository = module.get(getRepositoryToken(AdminSetting));
    usersService = module.get(UsersService);
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validDto = {
      spaceId: 'space-id-123',
      date: '2026-06-30',
      startTime: '08:10',
      endTime: '09:40',
    };

    it('should successfully create a pending reservation for standard users', async () => {
      const res = await service.create(validDto, mockUser.id, 'user');
      expect(res).toBeDefined();
      expect(res.status).toBe(ReservationStatus.PENDING);
      expect(mailService.sendMail).toHaveBeenCalled();
    });

    it('should successfully create an active reservation for admin users', async () => {
      const res = await service.create(validDto, mockUser.id, 'admin');
      expect(res).toBeDefined();
      expect(res.status).toBe(ReservationStatus.ACTIVE);
      expect(mailService.sendMail).toHaveBeenCalled();
    });

    it('should throw BadRequestException if startTime >= endTime', async () => {
      const invalidDto = { ...validDto, startTime: '10:00', endTime: '08:00' };
      await expect(service.create(invalidDto, mockUser.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject if user has an active penalty on that date', async () => {
      (usersService.getPenalties as jest.Mock).mockResolvedValue([
        { id: 'p1', startDate: '2026-06-25', endDate: '2026-07-02', reason: 'Late warnings', user: null, createdAt: new Date() }
      ]);

      await expect(service.create(validDto, mockUser.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject if space is blocked by administration', async () => {
      const mockQueryBuilder = spaceBlockRepository.createQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue({ id: 'block-id', reason: 'Maintenance' });

      await expect(service.create(validDto, mockUser.id))
        .rejects.toThrow(ConflictException);
    });

    it('should reject if standard user requests a non-aligned time slot', async () => {
      const misalignedDto = { ...validDto, endTime: '09:30' };
      await expect(service.create(misalignedDto, mockUser.id, 'user'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('confirm', () => {
    it('should allow confirming own reservation and check deadlines', async () => {
      const mockRes: Reservation = {
        id: 'res-1',
        date: '2026-07-10',
        startTime: '08:10',
        endTime: '09:40',
        status: ReservationStatus.PENDING,
        space: mockSpace as Space,
        user: mockUser as any,
        createdAt: new Date(),
      };

      (reservationRepository.findOne as jest.Mock).mockResolvedValue(mockRes);
      (adminSettingRepository.findOne as jest.Mock).mockResolvedValue({ id: 's1', key: 'confirm_deadline_days', value: '1', createdAt: new Date() });

      const res = await service.confirm('res-1', { role: 'user', userId: mockUser.id });
      expect(res.status).toBe(ReservationStatus.ACTIVE);
      expect(usersService.createWarning).not.toHaveBeenCalled();
    });

    it('should trigger UserWarning if user confirms reservation late', async () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const mockRes: Reservation = {
        id: 'res-1',
        date: todayStr,
        startTime: '08:10',
        endTime: '09:40',
        status: ReservationStatus.PENDING,
        space: mockSpace as Space,
        user: mockUser as any,
        createdAt: new Date(),
      };

      (reservationRepository.findOne as jest.Mock).mockResolvedValue(mockRes);
      (adminSettingRepository.findOne as jest.Mock).mockResolvedValue(null);

      const res = await service.confirm('res-1', { role: 'user', userId: mockUser.id });
      expect(res.status).toBe(ReservationStatus.ACTIVE);
      expect(usersService.createWarning).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user tries to confirm another user\'s reservation', async () => {
      const mockRes: Reservation = {
        id: 'res-1',
        date: '2026-07-10',
        startTime: '08:10',
        endTime: '09:40',
        status: ReservationStatus.PENDING,
        space: mockSpace as Space,
        user: { id: 'other-user-id' } as any,
        createdAt: new Date(),
      };

      (reservationRepository.findOne as jest.Mock).mockResolvedValue(mockRes);
      await expect(service.confirm('res-1', { role: 'user', userId: mockUser.id }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancel', () => {
    it('should trigger UserWarning if user cancels reservation late', async () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const mockRes: Reservation = {
        id: 'res-1',
        date: todayStr,
        startTime: '08:10',
        endTime: '09:40',
        status: ReservationStatus.ACTIVE,
        space: mockSpace as Space,
        user: mockUser as any,
        createdAt: new Date(),
      };

      (reservationRepository.findOne as jest.Mock).mockResolvedValue(mockRes);
      (reservationRepository.save as jest.Mock).mockImplementation(async (reservation: Reservation) => reservation);

      const res = await service.cancel('res-1', { role: 'user', userId: mockUser.id });
      expect(res.status).toBe(ReservationStatus.CANCELLED);
      expect(usersService.createWarning).toHaveBeenCalled();
    });
  });
});
