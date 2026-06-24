import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExperienceEntity } from './experience.entity';

@Entity({ name: 'experience_skills' })
export class ExperienceSkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ExperienceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'experience_id' })
  experience!: ExperienceEntity;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  icon!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
