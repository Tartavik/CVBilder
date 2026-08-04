import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'cvs' })
export class CvEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ default: 'Untitled CV' })
  title!: string;

  @Column({ default: 'single' })
  template!: 'single' | 'classic';

  @Column({ name: 'experience_skill_mode', default: 'text' })
  experienceSkillMode!: 'text' | 'icons';

  @Column({
    name: 'section_order',
    type: 'jsonb',
    default: ['personal', 'experience', 'education', 'skills', 'details'],
  })
  sectionOrder!: string[];

  @Column({ name: 'additional_sections', type: 'jsonb', default: [] })
  additionalSections!: Array<Record<string, string>>;

  @Column({ name: 'is_published', default: false })
  isPublished!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
