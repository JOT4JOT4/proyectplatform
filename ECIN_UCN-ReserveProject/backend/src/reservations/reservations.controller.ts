import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Body() createReservationDto: CreateReservationDto) {
    //usuario falso momentaneo
    return this.reservationsService.create(createReservationDto, 'usuario-falso-123');
  }

  @Get()
  findAll() {
    return this.reservationsService.findAll();
  }
  
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.reservationsService.cancel(id);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.reservationsService.findByUser(userId);
  }

}