import { Test, TestingModule } from '@nestjs/testing';
import { SpacesService } from './spaces.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Space } from './entities/space.entity';

describe('SpacesService', () => {
  let service: SpacesService;

  beforeEach(async () => {
    const mockSpaceRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpacesService,
        {
          provide: getRepositoryToken(Space),
          useValue: mockSpaceRepository,
        },
      ],
    }).compile();

    service = module.get<SpacesService>(SpacesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
