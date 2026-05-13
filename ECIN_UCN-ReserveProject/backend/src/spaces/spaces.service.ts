import { Injectable ,ConflictException} from '@nestjs/common';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { Space, SpaceType } from './entities/space.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
  ) {}

async create(createSpaceDto: any) {
    const existingSpace = await this.spaceRepository.findOne({
      where: {
        name: createSpaceDto.name,
        zone: createSpaceDto.zone,
      },
    });

    if (existingSpace) {
      throw new ConflictException(
        `Ya existe un espacio llamado '${createSpaceDto.name}' en la zona '${createSpaceDto.zone}'.`
      );
    }
    
    const newSpace = this.spaceRepository.create(createSpaceDto);
    return await this.spaceRepository.save(newSpace);
  }

async findAll(page: number, limit: number, zone?: string, type?: SpaceType) {
    const skip = (page - 1) * limit;
    const whereCondition: any = { isActive: true }; 

    if (zone) {
      whereCondition.zone = zone;
    }
    if (type) {
      whereCondition.type = type;
    }

    const [data, total] = await this.spaceRepository.findAndCount({
      where: whereCondition,
      skip: skip,
      take: limit,
      order: { name: 'ASC' }, 
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} space`;
  }

  update(id: number, updateSpaceDto: UpdateSpaceDto) {
    return `This action updates a #${id} space`;
  }

  remove(id: number) {
    return `This action removes a #${id} space`;
  }
}
