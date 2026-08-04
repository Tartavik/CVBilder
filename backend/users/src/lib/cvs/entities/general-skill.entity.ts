import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CvEntity } from './cv.entity';

@Entity({ name: 'general_skills' })
export class GeneralSkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CvEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cv_id' })
  cv!: CvEntity;

  @Column()
  name!: string;

  @Column({ nullable: true })
  level!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
