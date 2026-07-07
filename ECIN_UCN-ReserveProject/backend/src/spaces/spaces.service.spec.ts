import { Test, TestingModule } from '@nestjs/testing';
import { SpacesService } from './spaces.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Space } from './entities/space.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

describe('SpacesService', () => {
  let service: SpacesService;

  beforeEach(async () => {
    const mockSpaceRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const mockReservationRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpacesService,
        {
          provide: getRepositoryToken(Space),
          useValue: mockSpaceRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
      ],
    }).compile();

    service = module.get<SpacesService>(SpacesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
