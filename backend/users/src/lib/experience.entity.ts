import {
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { CvEntity } from './cv.entity';

@Entity({ name: 'experiences' })
export class ExperienceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CvEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cv_id' })
  cv!: CvEntity;

  @Column({ name: 'company_name' })
  companyName!: string;

  @Column({ name: 'position' })
  position!: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | null;

  @Column({ name: 'is_current', default: false })
  isCurrent!: boolean;

  @Column({ name: 'description', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
