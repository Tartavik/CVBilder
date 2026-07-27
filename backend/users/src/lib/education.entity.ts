import {
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { CvEntity } from './cv.entity';

@Entity({ name: 'education' })
export class EducationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CvEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cv_id' })
  cv!: CvEntity;

  @Column({ name: 'name' })
  name!: string;

  @Column({ name: 'degree' })
  degree!: string;

  @Column({ name: 'graduation_year', nullable: true })
  graduationYear!: number | null;

  @Column({ name: 'description', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
