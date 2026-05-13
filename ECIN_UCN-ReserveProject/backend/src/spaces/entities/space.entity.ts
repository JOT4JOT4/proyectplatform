import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Unique } from 'typeorm';

export enum SpaceType {
  ROOM = 'room',   
  TABLE = 'table', 
}

@Entity('spaces')
@Unique(['name', 'zone'])
export class Space {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; 

  @Column()
  zone: string; 

  @Column({ type: 'enum', enum: SpaceType, default: SpaceType.TABLE })
  type: SpaceType;

  @Column({ type: 'text', nullable: true })
  description: string; 

  @Column({ nullable: true })
  imageUrl: string; 

  @Column({ type: 'int', default: 1 })
  capacity: number; 

  @Column({ default: true })
  isActive: boolean; 

  @ManyToOne(() => Space, (space) => space.subspaces, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Space;

  @OneToMany(() => Space, (space) => space.parent)
  subspaces: Space[];

  @CreateDateColumn()
  createdAt: Date;
}
