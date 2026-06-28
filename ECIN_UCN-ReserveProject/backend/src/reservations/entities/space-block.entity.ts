import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Space } from '../../spaces/entities/space.entity';

@Entity('space_blocks')
export class SpaceBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Space, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spaceId' })
  space: Space;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string; // Equal to startDate if blocking a single day/block

  @Column({ type: 'time', nullable: true })
  startTime: string; // null means blocking the whole day

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column()
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
