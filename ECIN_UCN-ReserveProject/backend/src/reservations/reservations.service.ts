import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from './reservation.entity';
import { User } from '../users/entities/user.entity';

export interface CreateReservationDto {
  reservationDate: string;
  reservationSlot: string;
  space: {
    id: string;
    title: string;
    description?: string;
    area?: string | null;
    tipo?: string | null;
    isSubspace?: boolean;
    parentSpaceId?: string | null;
    parentSpaceTitle?: string | null;
  };
  filtersApplied?: {
    date: string;
    slot: string | null;
    area: string | null;
    tipo: string | null;
  };
}

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async createReservation(
    user: User,
    createReservationDto: CreateReservationDto,
  ): Promise<Reservation> {
    const reservation = new Reservation();
    reservation.user = user;
    reservation.userId = user.id;
    reservation.spaceTitle = createReservationDto.space.title;
    reservation.spaceDescription = createReservationDto.space.description;
    reservation.reservationDate = createReservationDto.reservationDate;
    reservation.reservationSlot = createReservationDto.reservationSlot;
    reservation.area = createReservationDto.space.area;
    reservation.tipo = createReservationDto.space.tipo;
    reservation.space = createReservationDto.space;
    reservation.filtersApplied = createReservationDto.filtersApplied;

    return this.reservationRepository.save(reservation);
  }

  async getUserReservations(userId: string): Promise<Reservation[]> {
    return this.reservationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllReservations(): Promise<Reservation[]> {
    return this.reservationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getReservationById(id: string): Promise<Reservation | null> {
    return this.reservationRepository.findOneBy({ id });
  }

  async deleteReservation(id: string, userId: string): Promise<boolean> {
    const result = await this.reservationRepository.delete({
      id,
      userId,
    });
    return (result.affected ?? 0) > 0;
  }
}
