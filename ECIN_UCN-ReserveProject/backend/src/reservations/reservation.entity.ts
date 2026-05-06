import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  spaceTitle: string;

  @Column({ nullable: true })
  spaceDescription?: string;

  @Column()
  reservationDate: string; // ISO format YYYY-MM-DD

  @Column()
  reservationSlot: string; // e.g., A, B, C, C2, D, E, F, G, H

  @Column({ type: 'varchar', nullable: true })
  area?: string | null;

  @Column({ type: 'varchar', nullable: true })
  tipo?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  space?: {
    id?: string;
    title?: string;
    description?: string;
    area?: string | null;
    tipo?: string | null;
    isSubspace?: boolean;
    parentSpaceId?: string | null;
    parentSpaceTitle?: string | null;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  filtersApplied?: {
    date: string;
    slot: string | null;
    area: string | null;
    tipo: string | null;
  };

  @ManyToOne(() => User, (user) => user.reservations, { eager: true })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
