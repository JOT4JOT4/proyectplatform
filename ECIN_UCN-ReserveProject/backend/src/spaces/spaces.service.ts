import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { Space, SpaceType } from './entities/space.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Reservation } from '../reservations/entities/reservation.entity';

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async create(createSpaceDto: CreateSpaceDto) {
    const existingSpace = await this.spaceRepository.findOne({
      where: {
        name: createSpaceDto.name,
        zone: createSpaceDto.zone,
      },
    });

    if (existingSpace) {
      throw new ConflictException(`Ya existe un espacio llamado '${createSpaceDto.name}' en la zona '${createSpaceDto.zone}'.`);
    }

    const parent = createSpaceDto.parentId
      ? await this.spaceRepository.findOne({ where: { id: createSpaceDto.parentId } })
      : null;

    const newSpace = this.spaceRepository.create({
      ...createSpaceDto,
      parent: parent ?? undefined,
    });

    return await this.spaceRepository.save(newSpace);
  }

  async findAll(page: number, limit: number, zone?: string, type?: SpaceType, includeInactive = false) {
    const skip = (page - 1) * limit;
    const whereCondition: any = includeInactive ? {} : { isActive: true };

    if (zone) {
      whereCondition.zone = zone;
    }

    if (type) {
      whereCondition.type = type;
    }

    const [data, total] = await this.spaceRepository.findAndCount({
      where: whereCondition,
      skip,
      take: limit,
      order: { name: 'ASC' },
      relations: ['parent', 'subspaces'],
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

  async findOne(id: string) {
    const space = await this.spaceRepository.findOne({ where: { id }, relations: ['parent', 'subspaces'] });
    if (!space) {
      throw new NotFoundException('El espacio no existe.');
    }

    return space;
  }

  async update(id: string, updateSpaceDto: UpdateSpaceDto) {
    const space = await this.spaceRepository.findOne({ where: { id }, relations: ['parent', 'subspaces'] });
    if (!space) {
      throw new NotFoundException('El espacio no existe.');
    }

    const nextName = updateSpaceDto.name ?? space.name;
    const nextZone = updateSpaceDto.zone ?? space.zone;

    const existingSpace = await this.spaceRepository.findOne({
      where: {
        id: Not(id),
        name: nextName,
        zone: nextZone,
      },
    });

    if (existingSpace) {
      throw new ConflictException(`Ya existe un espacio llamado '${nextName}' en la zona '${nextZone}'.`);
    }

    if (updateSpaceDto.parentId !== undefined) {
      space.parent = updateSpaceDto.parentId
        ? (await this.spaceRepository.findOne({ where: { id: updateSpaceDto.parentId } })) ?? null
        : null;
    }

    space.name = nextName;
    space.zone = nextZone;
    space.type = updateSpaceDto.type ?? space.type;
    space.description = updateSpaceDto.description ?? space.description;
    space.imageUrl = updateSpaceDto.imageUrl ?? space.imageUrl;
    space.capacity = updateSpaceDto.capacity ?? space.capacity;
    space.allowedTimeSlots = updateSpaceDto.allowedTimeSlots ?? space.allowedTimeSlots;
    space.isActive = updateSpaceDto.isActive ?? space.isActive;

    return await this.spaceRepository.save(space);
  }

  async remove(id: string) {
    const space = await this.spaceRepository.findOne({ where: { id }, relations: ['subspaces'] });
    if (!space) {
      throw new NotFoundException('El espacio no existe.');
    }

    return await this.spaceRepository.remove(space);
  }
}
