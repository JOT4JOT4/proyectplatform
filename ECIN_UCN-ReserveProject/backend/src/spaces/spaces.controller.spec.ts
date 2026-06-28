import { Test, TestingModule } from '@nestjs/testing';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { ReservationsService } from '../reservations/reservations.service';

describe('SpacesController', () => {
  let controller: SpacesController;

  beforeEach(async () => {
    const mockSpacesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockReservationsService = {
      getOccupiedSlots: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpacesController],
      providers: [
        {
          provide: SpacesService,
          useValue: mockSpacesService,
        },
        {
          provide: ReservationsService,
          useValue: mockReservationsService,
        },
      ],
    }).compile();

    controller = module.get<SpacesController>(SpacesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
