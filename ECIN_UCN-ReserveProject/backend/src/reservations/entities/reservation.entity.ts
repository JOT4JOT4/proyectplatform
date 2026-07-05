import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Space } from '../../spaces/entities/space.entity';
import { User } from '../../users/entities/user.entity'; 

export enum ReservationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  OBSOLETE = 'obsolete',
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

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  // RELACIONES
  @ManyToOne(() => Space, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'spaceId' })
  space: Space | null;


  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;


  @CreateDateColumn()
  createdAt: Date;
}