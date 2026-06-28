import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('block_configs')
export class BlockConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', unique: true })
  effectiveDate: string; // The date starting from which this config applies

  @Column({ type: 'int', default: 1 })
  divisions: number; // 1, 2, 3, or 4

  @CreateDateColumn()
  createdAt: Date;
}
