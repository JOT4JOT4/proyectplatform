import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { ReservationsService } from '../reservations/reservations.service';
import { SpaceType } from './entities/space.entity';

@Controller('spaces')
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly reservationsService: ReservationsService 
  ) {}

  @Post()
  create(@Body() createSpaceDto: any) {
    return this.spacesService.create(createSpaceDto);
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('zone') zone: string,
    @Query('type') type: SpaceType,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.spacesService.findAll(pageNumber, limitNumber, zone, type);
  }

  @Get(':id/availability')
  async getAvailability(
    @Param('id') spaceId: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('Debes proveer una fecha en la query (?date=YYYY-MM-DD)');
    }
    const ocupiedSlots = await this.reservationsService.getOccupiedSlots(spaceId, date);
    return {
      spaceId,
      date,
      timezone: 'America/Santiago',
      ocupiedSlots
    };
  }
}