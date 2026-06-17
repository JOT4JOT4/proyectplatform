import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  /**
   * CREAR RESERVA: Integra todas las validaciones de negocio.
   */
  async create(createReservationDto: CreateReservationDto, userId: string = 'dummy-user') {
    const { spaceId, date, startTime, endTime } = createReservationDto;

    // 1. Validar lógica de tiempo básico
    if (startTime >= endTime) {
      throw new BadRequestException('La hora de inicio debe ser menor a la hora de término.');
    }

    // 2. Validar límite semanal del usuario (Ej: Máximo 3 por semana)
    await this.checkWeeklyLimit(userId, date);

    // 3. Escudo Anti-Colisiones (Overlap Check):
    // Revisa si ya existe alguna reserva activa que se cruce con este horario
    const overlappingReservations = await this.reservationRepository.createQueryBuilder('reservation')
      .where('reservation.spaceId = :spaceId', { spaceId })
      .andWhere('reservation.date = :date', { date })
      .andWhere('reservation.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere(
        '((reservation.startTime < :endTime AND reservation.endTime > :startTime))',
        { startTime, endTime }
      )
      .getMany();

    if (overlappingReservations.length > 0) {
      throw new ConflictException('El espacio ya se encuentra reservado en ese rango de horario.');
    }

    // 4. Crear y guardar si pasó todas las pruebas
    const newReservation = this.reservationRepository.create({
      date,
      startTime,
      endTime,
      space: { id: spaceId },
      // user: { id: userId }, //  Descomentar cuando la entidad User esté vinculada
    });

    return await this.reservationRepository.save(newReservation);
  }

  /**
   * LÍMITE SEMANAL (SCRUM-34): Calcula el Lunes y Domingo de la fecha solicitada de forma segura.
   */
  async checkWeeklyLimit(userId: string, targetDate: string): Promise<void> {
    const MAX_RESERVATIONS_PER_WEEK = 3;

    // 1. Desarmar el string 'YYYY-MM-DD' para evitar problemas de zona horaria UTC
    const [year, month, day] = targetDate.split('-').map(Number);
    
    // 2. Crear la fecha al mediodía local (12:00) para evitar saltos de día por cambios de horario de verano
    const localDate = new Date(year, month - 1, day, 12, 0, 0);

    // 3. Calcular la diferencia de días hacia el Lunes más cercano
    const dayOfWeek = localDate.getDay(); // 0 = Domingo, 1 = Lunes...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    // 4. Crear objetos limpios e independientes para Lunes y Domingo
    const monday = new Date(localDate);
    monday.setDate(localDate.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // 5. Función helper para volver a convertir a 'YYYY-MM-DD' sin usar toISOString()
    const formatToDateString = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const startOfWeek = formatToDateString(monday);
    const endOfWeek = formatToDateString(sunday);

    // 6. Consulta a PostgreSQL con los rangos exactos
    const weeklyCount = await this.reservationRepository.count({
      where: {
        // userId: userId, // Descomentar cuando la entidad User esté vinculada
        status: ReservationStatus.ACTIVE,
        date: Between(startOfWeek, endOfWeek),
      },
    });

    if (weeklyCount >= MAX_RESERVATIONS_PER_WEEK) {
      throw new BadRequestException(`Has alcanzado el límite de ${MAX_RESERVATIONS_PER_WEEK} reservas para esta semana.`);
    }
  }

  /**
   * DISPONIBILIDAD (SCRUM-35): Devuelve las horas ocupadas de una sala un día específico.
   */
  async getOccupiedSlots(spaceId: string, date: string) {
    const reservations = await this.reservationRepository.find({
      where: {
        space: { id: spaceId },
        date: date,
        status: ReservationStatus.ACTIVE,
      },
      select: ['startTime', 'endTime'], // Oculta los datos del usuario por privacidad
      order: { startTime: 'ASC' } // Entrega los horarios ordenados cronológicamente al frontend
    });

    return reservations;
  }

  /**
   * OBTENER TODAS: Para paneles de administración
   */
  async findAll() {
    return await this.reservationRepository.find({
      relations: ['space'], // Para que el JSON incluya los datos de la sala, no solo el ID
      order: { date: 'DESC', startTime: 'DESC' }
    });
  }

  /**
   * CANCELAR RESERVA: Soft-delete cambiando el estado
   */
  async cancel(id: string) {
    const reservation = await this.reservationRepository.findOne({ where: { id } });
    
    if (!reservation) {
      throw new NotFoundException('La reserva no existe.');
    }
    
    reservation.status = ReservationStatus.CANCELLED;
    return await this.reservationRepository.save(reservation);
  }
}