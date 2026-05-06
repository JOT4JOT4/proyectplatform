import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReservationsService } from './reservations.service';
import type { CreateReservationDto } from './reservations.service';

@Controller('reservas')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReservation(@Req() req: any, @Body() dto: CreateReservationDto) {
    return this.reservationsService.createReservation(req.user, dto);
  }

  @Get()
  async getAllReservations() {
    return this.reservationsService.getAllReservations();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyReservations(@Req() req: any) {
    return this.reservationsService.getUserReservations(req.user.id);
  }

  @Get(':id')
  async getReservation(@Param('id') id: string) {
    return this.reservationsService.getReservationById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteReservation(@Param('id') id: string, @Req() req: any) {
    const deleted = await this.reservationsService.deleteReservation(id, req.user.id);
    return { deleted };
  }
}
