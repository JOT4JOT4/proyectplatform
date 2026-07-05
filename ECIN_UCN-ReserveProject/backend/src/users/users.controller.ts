import { Controller, Get, Post, Body, Param, UseGuards, Req, ForbiddenException, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Post(':userId/penalties')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  createPenalty(
    @Param('userId') userId: string,
    @Body() penaltyData: { startDate: string; endDate: string; reason: string },
  ) {
    return this.usersService.createPenalty(userId, penaltyData);
  }

  @Patch(':userId/weekly-limit')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  updateWeeklyLimit(
    @Param('userId') userId: string,
    @Body() body: { maxWeeklyReservations: number | null },
  ) {
    return this.usersService.updateWeeklyLimit(userId, body.maxWeeklyReservations ?? null);
  }

  @Get(':userId/penalties')
  @UseGuards(AuthGuard('jwt'))
  getPenalties(@Param('userId') userId: string, @Req() req) {
    if (req.user.role !== UserRole.ADMIN && req.user.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta información');
    }
    return this.usersService.getPenalties(userId);
  }

  @Get(':userId/warnings')
  @UseGuards(AuthGuard('jwt'))
  getWarnings(@Param('userId') userId: string, @Req() req) {
    if (req.user.role !== UserRole.ADMIN && req.user.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta información');
    }
    return this.usersService.getWarnings(userId);
  }
}
