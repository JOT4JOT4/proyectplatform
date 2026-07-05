import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createReservationDto: CreateReservationDto, @Req() req) {
    // Si el rol es admin y se provee un userId específico, se reserva a nombre de ese usuario.
    // De lo contrario, se reserva a nombre del usuario autenticado.
    const targetUserId = (req.user.role === UserRole.ADMIN && createReservationDto.userId)
      ? createReservationDto.userId
      : req.user.userId;

    return this.reservationsService.create(createReservationDto, targetUserId, req.user.role);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.reservationsService.findAll();
  }

  @Patch(':id/confirm')
  @UseGuards(AuthGuard('jwt'))
  confirm(@Param('id') id: string, @Req() req) {
    return this.reservationsService.confirm(id, {
      role: req.user.role,
      userId: req.user.userId,
    });
  }
  
  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  cancel(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req) {
    return this.reservationsService.cancel(id, {
      role: req.user.role,
      userId: req.user.userId,
    }, body?.reason);
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard('jwt'))
  findByUser(@Param('userId') userId: string, @Req() req) {
    if (req.user.role !== UserRole.ADMIN && req.user.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este historial de reservas.');
    }
    return this.reservationsService.findByUser(userId);
  }

  // --- ENDPOINTS DE BLOQUEO ADMINISTRATIVO ---

  @Post('blocks')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  createBlock(
    @Body() blockData: { spaceId: string; startDate: string; endDate: string; startTime?: string; endTime?: string; reason: string },
  ) {
    return this.reservationsService.createBlock(blockData.spaceId, blockData);
  }

  @Delete('blocks/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  removeBlock(@Param('id') id: string) {
    return this.reservationsService.removeBlock(id);
  }

  @Get('blocks')
  getBlocks() {
    return this.reservationsService.getBlocks();
  }

  // --- ENDPOINTS DE CONFIGURACIÓN DE DIVISIONES ---

  @Post('block-config')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  createBlockConfig(
    @Body() configData: { effectiveDate: string; divisions: number },
  ) {
    return this.reservationsService.createBlockConfig(configData.effectiveDate, configData.divisions);
  }

  @Get('block-config')
  getBlockConfigs() {
    return this.reservationsService.getBlockConfigs();
  }

  // --- ENDPOINTS DE SETTINGS DE RESERVAS (PLAZOS Y ADVERTENCIAS) ---

  @Post('settings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  setSetting(@Body() body: { key: string; value: string }) {
    return this.reservationsService.setSetting(body.key, body.value);
  }

  @Get('settings')
  getSettings() {
    return this.reservationsService.getAllSettings();
  }
}