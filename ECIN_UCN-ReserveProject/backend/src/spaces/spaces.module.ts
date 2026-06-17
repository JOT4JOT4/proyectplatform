import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacesService } from './spaces.service';
import { SpacesController } from './spaces.controller';
import { Space } from './entities/space.entity'; 
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Space]), ReservationsModule],
  controllers: [SpacesController],
  providers: [SpacesService],
})
export class SpacesModule {}