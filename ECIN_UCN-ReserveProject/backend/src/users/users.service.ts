import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserPenalty } from './entities/user-penalty.entity';
import { UserWarning } from './entities/user-warning.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserPenalty)
    private penaltiesRepository: Repository<UserPenalty>,
    @InjectRepository(UserWarning)
    private warningsRepository: Repository<UserWarning>,
    private readonly mailService: MailService,
  ) {}

  async findOrCreate(userData: Partial<User>): Promise<User> {
    const { email } = userData;
    let user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      user = this.usersRepository.create(userData);
      return await this.usersRepository.save(user);
    }
    
    return user;
  }

  async createPenalty(userId: string, penaltyData: { startDate: string; endDate: string; reason: string }): Promise<UserPenalty> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const penalty = this.penaltiesRepository.create({
      ...penaltyData,
      user,
    });
    
    const savedPenalty = await this.penaltiesRepository.save(penalty);

    // Enviar correo electrónico de suspensión
    if (user.email) {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #cc0000;">Infracción Aplicada - Cuenta Suspendida</h2>
          <p>Hola <strong>${user.firstName} ${user.lastName}</strong>,</p>
          <p>Te informamos que tu cuenta ha sido suspendida temporalmente debido al incumplimiento de las políticas de uso del sistema:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px; font-weight: bold;">Motivo:</td><td style="padding: 8px;">${penaltyData.reason}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Desde:</td><td style="padding: 8px;">${penaltyData.startDate}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px; font-weight: bold;">Hasta:</td><td style="padding: 8px;">${penaltyData.endDate}</td></tr>
          </table>
          <p style="margin-top: 20px; color: #cc0000; font-weight: bold;">Durante este periodo de tiempo no podrás realizar nuevas reservas de espacios.</p>
        </div>
      `;
      await this.mailService.sendMail(
        user.email,
        `[UCN Reservas] Suspensión de Cuenta - Infracción Aplicada`,
        htmlContent
      );
    }

    return savedPenalty;
  }

  async getPenalties(userId: string): Promise<UserPenalty[]> {
    return await this.penaltiesRepository.find({
      where: { user: { id: userId } },
      order: { startDate: 'DESC' },
    });
  }

  async createWarning(userId: string, reason: string, maxWarnings: number): Promise<UserWarning> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    const warning = this.warningsRepository.create({
      user,
      reason,
      date: todayStr,
    });
    
    const savedWarning = await this.warningsRepository.save(warning);
    
    // Contar advertencias acumuladas
    const warningsCount = await this.warningsRepository.count({
      where: { user: { id: userId } },
    });

    // Enviar correo de advertencia
    if (user.email) {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #e65c00;">Advertencia de Infracción Registrada</h2>
          <p>Hola <strong>${user.firstName} ${user.lastName}</strong>,</p>
          <p>Se ha registrado una advertencia automática en tu cuenta:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px; font-weight: bold;">Motivo:</td><td style="padding: 8px;">${reason}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Fecha:</td><td style="padding: 8px;">${todayStr}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px; font-weight: bold;">Advertencias Acumuladas:</td><td style="padding: 8px; font-weight: bold; color: #e65c00;">${warningsCount} / ${maxWarnings}</td></tr>
          </table>
          <p style="margin-top: 20px; font-weight: bold;">Recuerda que si acumulas más de ${maxWarnings} advertencias de cancelación/confirmación tardía, tu cuenta se suspenderá automáticamente por 7 días.</p>
        </div>
      `;
      await this.mailService.sendMail(
        user.email,
        `[UCN Reservas] Advertencia de Infracción`,
        htmlContent
      );
    }
    
    if (warningsCount > maxWarnings) {
      // Bloqueo automático por 7 días
      const today = new Date();
      const endPenalty = new Date();
      endPenalty.setDate(today.getDate() + 7);
      
      const formatToDateString = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      
      await this.createPenalty(userId, {
        startDate: formatToDateString(today),
        endDate: formatToDateString(endPenalty),
        reason: `Acumulación de ${warningsCount} advertencias de cancelación/confirmación tardía (Límite: ${maxWarnings}). Bloqueo automático de 7 días.`,
      });
    }
    
    return savedWarning;
  }

  async getWarnings(userId: string): Promise<UserWarning[]> {
    return await this.warningsRepository.find({
      where: { user: { id: userId } },
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }
}