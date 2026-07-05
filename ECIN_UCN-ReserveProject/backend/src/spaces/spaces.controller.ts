import { Controller, Get, Post, Body, Param, Query, BadRequestException, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SpacesService } from './spaces.service';
import { ReservationsService } from '../reservations/reservations.service';
import { SpaceType } from './entities/space.entity';
import { UserRole } from '../users/entities/user.entity';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Controller('spaces')
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly reservationsService: ReservationsService 
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createSpaceDto: CreateSpaceDto) {
    return this.spacesService.create(createSpaceDto);
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('zone') zone: string,
    @Query('type') type: SpaceType,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 100;
    return this.spacesService.findAll(pageNumber, limitNumber, zone, type, true);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateSpaceDto: UpdateSpaceDto) {
    return this.spacesService.update(id, updateSpaceDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.spacesService.remove(id);
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
    const divisions = await this.reservationsService.getDivisionsForDate(date);
    return {
      spaceId,
      date,
      timezone: 'America/Santiago',
      ocupiedSlots,
      divisions
    };
  }
}