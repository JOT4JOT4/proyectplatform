import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Space } from '../../spaces/entities/space.entity';
import { User } from '../../users/entities/user.entity'; 

export enum ReservationStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string; // Formato YYYY-MM-DD

  @Column({ type: 'time' })
  startTime: string; // Formato HH:mm

  @Column({ type: 'time' })
  endTime: string; // Formato HH:mm

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.ACTIVE })
  status: ReservationStatus;

  // RELACIONES
  @ManyToOne(() => Space)
  @JoinColumn({ name: 'spaceId' })
  space: Space;


  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;


  @CreateDateColumn()
  createdAt: Date;
}