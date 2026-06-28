import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

describe('ReservationsController', () => {
  let controller: ReservationsController;

  beforeEach(async () => {
    const mockReservationsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      confirm: jest.fn(),
      cancel: jest.fn(),
      findByUser: jest.fn(),
      createBlock: jest.fn(),
      removeBlock: jest.fn(),
      getBlocks: jest.fn(),
      createBlockConfig: jest.fn(),
      getBlockConfigs: jest.fn(),
      getAllSettings: jest.fn(),
      setSetting: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsService,
          useValue: mockReservationsService,
        },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
