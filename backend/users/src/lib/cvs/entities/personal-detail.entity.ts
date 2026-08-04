import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CvEntity } from './cv.entity';

@Entity({ name: 'personal_details' })
export class PersonalDetailEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CvEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cv_id' })
  cv!: CvEntity;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ name: 'email', nullable: true })
  email!: string | null;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber!: string | null;

  @Column({ name: 'address', nullable: true })
  address!: string | null;

  @Column({ name: 'job_title', nullable: true })
  jobTitle!: string | null;

  @Column({ name: 'summary', nullable: true })
  summary!: string | null;

  @Column({ name: 'photo_url', nullable: true })
  photoUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
