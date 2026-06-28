import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { UserPenalty } from './user-penalty.entity';
import { UserWarning } from './user-warning.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  picture: string; 

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations: Reservation[];

  @OneToMany(() => UserPenalty, (penalty) => penalty.user)
  penalties: UserPenalty[];

  @OneToMany(() => UserWarning, (warning) => warning.user)
  warnings: UserWarning[];

  @CreateDateColumn()
  createdAt: Date;
}