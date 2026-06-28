import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Reservation } from './entities/reservation.entity'; 
import { SpaceBlock } from './entities/space-block.entity';
import { BlockConfig } from './entities/block-config.entity';
import { AdminSetting } from './entities/admin-setting.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, SpaceBlock, BlockConfig, AdminSetting]),
    UsersModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService, TypeOrmModule],
})
export class ReservationsModule {}