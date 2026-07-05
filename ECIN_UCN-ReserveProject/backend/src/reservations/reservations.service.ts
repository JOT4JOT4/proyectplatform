import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Space } from '../spaces/entities/space.entity';
import { SpaceBlock } from './entities/space-block.entity';
import { BlockConfig } from './entities/block-config.entity';
import { AdminSetting } from './entities/admin-setting.entity';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { getDividedBlocks } from './utils/block-divider';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(SpaceBlock)
    private readonly spaceBlockRepository: Repository<SpaceBlock>,
    @InjectRepository(BlockConfig)
    private readonly blockConfigRepository: Repository<BlockConfig>,
    @InjectRepository(AdminSetting)
    private readonly adminSettingRepository: Repository<AdminSetting>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  private async markExpiredReservationsAsObsolete() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const expiredReservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.status IN (:...statuses)', { statuses: [ReservationStatus.ACTIVE, ReservationStatus.PENDING] })
      .andWhere('(reservation.date < :today OR (reservation.date = :today AND reservation.endTime <= :currentTime))', {
        today,
        currentTime,
      })
      .getMany();

    if (expiredReservations.length === 0) {
      return;
    }

    for (const reservation of expiredReservations) {
      reservation.status = ReservationStatus.OBSOLETE;
    }

    await this.reservationRepository.save(expiredReservations);
  }

  /**
   * CREAR RESERVA: Integra todas las validaciones de negocio, bloqueos, penalizaciones y notifica por correo.
   */
  async create(createReservationDto: CreateReservationDto, userId: string, userRole: string = 'user') {
    await this.markExpiredReservationsAsObsolete();

    const { spaceId, date, startTime, endTime } = createReservationDto;

    if (startTime >= endTime) {
      throw new BadRequestException('La hora de inicio debe ser menor a la hora de término.');
    }

    // 1. Validar si el usuario está penalizado
    const penalties = await this.usersService.getPenalties(userId);
    const hasActivePenalty = penalties.some((penalty) => {
      return date >= penalty.startDate && date <= penalty.endDate;
    });
    if (hasActivePenalty) {
      throw new BadRequestException('El usuario tiene una penalización activa en esta fecha y no puede realizar reservas.');
    }

    if (userRole !== 'admin') {
      const maxAdvanceDaysStr = await this.getSetting('reservation_max_advance_days', '30');
      const maxAdvanceDays = parseInt(maxAdvanceDaysStr, 10);
      const [y, m, d] = date.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d, 12, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > maxAdvanceDays) {
        throw new BadRequestException(`La reserva no puede hacerse con más de ${maxAdvanceDays} día(s) de anticipación.`);
      }
    }

    // 2. Validar si el espacio está bloqueado administrativamente
    const overlappingBlock = await this.spaceBlockRepository.createQueryBuilder('block')
      .where('block.spaceId = :spaceId', { spaceId })
      .andWhere('block.startDate <= :date AND block.endDate >= :date', { date })
      .andWhere(
        '(block.startTime IS NULL OR (block.startTime < :endTime AND block.endTime > :startTime))',
        { startTime, endTime }
      )
      .getOne();

    if (overlappingBlock) {
      throw new ConflictException(`El espacio está bloqueado por administración: ${overlappingBlock.reason}`);
    }

    // 3. Validar división de bloques (si no es admin)
    const config = await this.blockConfigRepository.createQueryBuilder('config')
      .where('config.effectiveDate <= :date', { date })
      .orderBy('config.effectiveDate', 'DESC')
      .getOne();

    const divisions = config ? config.divisions : 1;
    const allowedSlots = getDividedBlocks(divisions);
    const isValidSlot = allowedSlots.some((slot) => slot.startTime === startTime && slot.endTime === endTime);

    if (!isValidSlot && userRole !== 'admin') {
      throw new BadRequestException(`El horario solicitado no coincide con la división de bloques permitida (${divisions} división(es) para esta fecha).`);
    }

    const fullUser = await this.usersService.findOne(userId);

    const savedReservation = await this.reservationRepository.manager.transaction(async (transactionalEntityManager) => {
      
      // 4. Si otra petición intenta usar esta misma sala al mismo milisegundo, esperará 
      const space = await transactionalEntityManager.findOne(Space, {
        where: { id: spaceId },
        lock: { mode: 'pessimistic_write' } 
      });

      if (!space) {
        throw new NotFoundException('El espacio seleccionado no existe.');
      }

      // 5. Validar límite semanal del usuario (solo si no es admin)
      if (userRole !== 'admin') {
        const globalWeeklyLimitStr = await this.getSetting('reservation_weekly_limit', '3');
        const globalWeeklyLimit = parseInt(globalWeeklyLimitStr, 10);
        const weeklyLimit = await this.usersService.getWeeklyReservationLimit(userId, globalWeeklyLimit);
        await this.checkWeeklyLimit(userId, date, weeklyLimit);
      }

      const requestedSlotKey = `${startTime}-${endTime}`;

      if (Array.isArray(space.allowedTimeSlots) && space.allowedTimeSlots.length > 0 && !space.allowedTimeSlots.includes(requestedSlotKey)) {
        throw new BadRequestException('El bloque solicitado no está permitido para este espacio.');
      }

      // 6. Revisar colisiones de horario (usando el manager de la transacción)
      const overlappingReservations = await transactionalEntityManager.createQueryBuilder(Reservation, 'reservation')
        .where('reservation.spaceId = :spaceId', { spaceId })
        .andWhere('reservation.date = :date', { date })
        .andWhere('reservation.status IN (:...statuses)', { statuses: [ReservationStatus.ACTIVE, ReservationStatus.PENDING] })
        .andWhere(
          '((reservation.startTime < :endTime AND reservation.endTime > :startTime))',
          { startTime, endTime }
        )
        .getMany();

      if (overlappingReservations.length > 0) {
        throw new ConflictException('El espacio ya se encuentra reservado o tiene una solicitud pendiente en ese rango de horario.');
      }

      // 7. Guardar la reserva de forma segura
      // Los administradores crean reservas directamente en estado ACTIVE, los usuarios normales en PENDING
      const initialStatus = userRole === 'admin' ? ReservationStatus.ACTIVE : ReservationStatus.PENDING;

      const newReservation = transactionalEntityManager.create(Reservation, {
        date,
        startTime,
        endTime,
        status: initialStatus,
        space: { id: spaceId },
        user: { id: userId }
      });

      return await transactionalEntityManager.save(Reservation, newReservation);
    });

    // 8. Enviar correo electrónico de confirmación de registro
    if (fullUser?.email) {
      const fullSpace = await this.reservationRepository.manager.findOne(Space, { where: { id: spaceId } });
      const statusText = savedReservation.status === ReservationStatus.ACTIVE ? 'Confirmada (Activa)' : 'Pendiente de Confirmación';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #003366;">¡Solicitud de Reserva Registrada!</h2>
          <p>Hola <strong>${fullUser.firstName} ${fullUser.lastName}</strong>,</p>
          <p>Tu solicitud de reserva ha sido ingresada exitosamente en el sistema:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px; font-weight: bold;">Espacio:</td><td style="padding: 8px;">${fullSpace?.name || 'N/A'} (Zona: ${fullSpace?.zone || 'N/A'})</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Fecha:</td><td style="padding: 8px;">${date}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px; font-weight: bold;">Horario:</td><td style="padding: 8px;">${startTime} - ${endTime}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Estado:</td><td style="padding: 8px; color: #cc6600; font-weight: bold;">${statusText}</td></tr>
          </table>
          <p style="margin-top: 20px;">Gracias por usar el sistema de reservas UCN.</p>
        </div>
      `;
      await this.mailService.sendMail(
        fullUser.email, 
        `[UCN Reservas] Reserva Registrada - ${fullSpace?.name || ''}`, 
        htmlContent
      );
    }

    return savedReservation;
  }

  /**
   * LÍMITE SEMANAL (SCRUM-34): Calcula el Lunes y Domingo de la fecha solicitada de forma segura.
   */
  async checkWeeklyLimit(userId: string, targetDate: string, maxReservationsPerWeek = 3): Promise<void> {

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

    // 6. Consulta a PostgreSQL con los rangos exactos (contando PENDING y ACTIVE)
    const weeklyCount = await this.reservationRepository.count({
      where: {
        user: { id: userId },
        status: In([ReservationStatus.ACTIVE, ReservationStatus.PENDING]),
        date: Between(startOfWeek, endOfWeek),
      },
    });

    if (weeklyCount >= maxReservationsPerWeek) {
      throw new BadRequestException(`Has alcanzado el límite de ${maxReservationsPerWeek} reservas para esta semana.`);
    }
  }

  /**
   * DISPONIBILIDAD (SCRUM-35): Devuelve las horas ocupadas de una sala un día específico.
   */
  async getOccupiedSlots(spaceId: string, date: string) {
    await this.markExpiredReservationsAsObsolete();

    const reservations = await this.reservationRepository.find({
      where: {
        space: { id: spaceId },
        date: date,
        status: In([ReservationStatus.ACTIVE, ReservationStatus.PENDING]),
      },
      select: ['startTime', 'endTime'],
      order: { startTime: 'ASC' }
    });

    return reservations;
  }

  async getDivisionsForDate(date: string): Promise<number> {
    const config = await this.blockConfigRepository.createQueryBuilder('config')
      .where('config.effectiveDate <= :date', { date })
      .orderBy('config.effectiveDate', 'DESC')
      .getOne();

    return config ? config.divisions : 1;
  }

  /**
   * OBTENER TODAS: Para paneles de administración
   */
  async findAll() {
    await this.markExpiredReservationsAsObsolete();

    return await this.reservationRepository.find({
      relations: ['space', 'user'],
      order: { date: 'DESC', startTime: 'DESC' }
    });
  }

  /**
   * CONFIRMAR RESERVA: Permite confirmar y valida plazos generando advertencias
   */
  async confirm(id: string, actingUser: { role: string; userId: string }) {
    const reservation = await this.reservationRepository.findOne({ 
      where: { id },
      relations: ['user', 'space']
    });
    if (!reservation) {
      throw new NotFoundException('La reserva no existe.');
    }

    if (actingUser.role !== 'admin' && reservation.user?.id !== actingUser.userId) {
      throw new ForbiddenException('No tienes permiso para confirmar esta reserva.');
    }

    reservation.status = ReservationStatus.ACTIVE;
    const savedReservation = await this.reservationRepository.save(reservation);

    // Enviar correo de confirmación de reserva
    if (reservation.user?.email) {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #006633;">¡Tu Reserva ha sido Confirmada!</h2>
          <p>Hola <strong>${reservation.user.firstName} ${reservation.user.lastName}</strong>,</p>
          <p>Te informamos que tu reserva ha cambiado su estado a <strong>Confirmada (Activa)</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px; font-weight: bold;">Espacio:</td><td style="padding: 8px;">${reservation.space?.name || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Fecha:</td><td style="padding: 8px;">${reservation.date}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px; font-weight: bold;">Horario:</td><td style="padding: 8px;">${reservation.startTime} - ${reservation.endTime}</td></tr>
          </table>
          <p style="margin-top: 20px; font-weight: bold; color: #006633;">¡Te esperamos!</p>
        </div>
      `;
      await this.mailService.sendMail(
        reservation.user.email,
        `[UCN Reservas] Reserva Confirmada - ${reservation.space?.name || ''}`,
        htmlContent
      );
    }

    // Si es usuario normal, validar plazos
    if (actingUser.role !== 'admin') {
      const confirmDeadlineDaysStr = await this.getSetting('confirm_deadline_days', '1');
      const confirmDeadlineDays = parseInt(confirmDeadlineDaysStr, 10);
      const maxWarningsStr = await this.getSetting('max_warnings', '3');
      const maxWarnings = parseInt(maxWarningsStr, 10);

      // Calcular diferencia en días
      const [y, m, d] = reservation.date.split('-').map(Number);
      const resDate = new Date(y, m - 1, d);
      resDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = resDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < confirmDeadlineDays) {
        // Advertencia automática por confirmación tardía
        await this.usersService.createWarning(
          actingUser.userId,
          `Confirmación tardía de la reserva para el ${reservation.date} (Plazo mínimo: ${confirmDeadlineDays} día(s), realizado con ${diffDays} día(s) de anticipación).`,
          maxWarnings
        );
      }
    }

    return savedReservation;
  }

  /**
   * CANCELAR RESERVA: Permite a administradores cancelar cualquiera, y a usuarios solo la suya (validando plazos).
   */
  async cancel(id: string, actingUser: { role: string; userId: string }, reason?: string) {
    const reservation = await this.reservationRepository.findOne({ 
      where: { id },
      relations: ['user', 'space'] 
    });
    
    if (!reservation) {
      throw new NotFoundException('La reserva no existe.');
    }

    if (actingUser.role !== 'admin' && reservation.user?.id !== actingUser.userId) {
      throw new ForbiddenException('No tienes permiso para cancelar esta reserva.');
    }

    // Enviar correo de cancelación
    if (reservation.user?.email) {
      const reasonText = reason?.trim() || 'Sin motivo registrado';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #990000;">Reserva Cancelada</h2>
          <p>Hola <strong>${reservation.user.firstName} ${reservation.user.lastName}</strong>,</p>
          <p>Te informamos que la siguiente reserva ha sido <strong>Cancelada</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px; font-weight: bold;">Espacio:</td><td style="padding: 8px;">${reservation.space?.name || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Fecha:</td><td style="padding: 8px;">${reservation.date}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px; font-weight: bold;">Horario:</td><td style="padding: 8px;">${reservation.startTime} - ${reservation.endTime}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Motivo:</td><td style="padding: 8px;">${reasonText}</td></tr>
          </table>
          <p style="margin-top: 20px; color: #555;">Si crees que esto es un error o tienes alguna consulta, por favor comunícate con administración.</p>
        </div>
      `;
      await this.mailService.sendMail(
        reservation.user.email,
        `[UCN Reservas] Reserva Cancelada - ${reservation.space?.name || ''}`,
        htmlContent
      );
    }

    await this.reservationRepository.remove(reservation);

    // Si es usuario normal, validar plazos
    if (actingUser.role !== 'admin') {
      const cancelDeadlineDaysStr = await this.getSetting('cancel_deadline_days', '1');
      const cancelDeadlineDays = parseInt(cancelDeadlineDaysStr, 10);
      const maxWarningsStr = await this.getSetting('max_warnings', '3');
      const maxWarnings = parseInt(maxWarningsStr, 10);

      // Calcular diferencia en días
      const [y, m, d] = reservation.date.split('-').map(Number);
      const resDate = new Date(y, m - 1, d);
      resDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = resDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < cancelDeadlineDays) {
        // Advertencia automática por cancelación tardía
        await this.usersService.createWarning(
          actingUser.userId,
          `Cancelación tardía de la reserva para el ${reservation.date} (Plazo mínimo: ${cancelDeadlineDays} día(s), realizado con ${diffDays} día(s) de anticipación).`,
          maxWarnings
        );
      }
    }

    return { message: 'Reserva eliminada correctamente.' };
  }

  /**
   * HISTORIAL DE RESERVAS (SCRUM-44)
   */
  async findByUser(userId: string) {
    await this.markExpiredReservationsAsObsolete();

    return await this.reservationRepository.find({
      where: {
        user: { id: userId },
      },
      relations: ['space'], 
      order: {
        date: 'DESC',      
        startTime: 'DESC'
      }
    });
  } 

  // --- MÉTODOS DE BLOQUEO ADMINISTRATIVO ---

  async createBlock(spaceId: string, blockData: { startDate: string; endDate: string; startTime?: string; endTime?: string; reason: string }) {
    const block = this.spaceBlockRepository.create({
      space: { id: spaceId },
      ...blockData,
    });
    return await this.spaceBlockRepository.save(block);
  }

  async removeBlock(id: string) {
    const block = await this.spaceBlockRepository.findOne({ where: { id } });
    if (!block) {
      throw new NotFoundException('El bloqueo no existe.');
    }
    return await this.spaceBlockRepository.remove(block);
  }

  async getBlocks() {
    return await this.spaceBlockRepository.find({ relations: ['space'] });
  }

  // --- MÉTODOS DE CONFIGURACIÓN DE DIVISIONES ---

  async createBlockConfig(effectiveDate: string, divisions: number) {
    if (divisions < 1 || divisions > 4) {
      throw new BadRequestException('Las divisiones deben estar entre 1 y 4.');
    }
    let config = await this.blockConfigRepository.findOne({ where: { effectiveDate } });
    if (config) {
      config.divisions = divisions;
    } else {
      config = this.blockConfigRepository.create({ effectiveDate, divisions });
    }
    return await this.blockConfigRepository.save(config);
  }

  async getBlockConfigs() {
    return await this.blockConfigRepository.find({ order: { effectiveDate: 'DESC' } });
  }

  // --- MÉTODOS DE CONFIGURACIÓN GENERAL (SETTINGS) ---

  async getSetting(key: string, defaultValue: string): Promise<string> {
    const setting = await this.adminSettingRepository.findOne({ where: { key } });
    return setting ? setting.value : defaultValue;
  }

  async setSetting(key: string, value: string): Promise<AdminSetting> {
    let setting = await this.adminSettingRepository.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
    } else {
      setting = this.adminSettingRepository.create({ key, value });
    }
    return await this.adminSettingRepository.save(setting);
  }

  async getAllSettings() {
    return await this.adminSettingRepository.find();
  }
}
