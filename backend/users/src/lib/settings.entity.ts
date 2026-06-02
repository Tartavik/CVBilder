import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity';

export type ThemeMode = 'light' | 'dark';

@Entity({ name: 'settings' })
export class SettingsEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity;

    @Column({
        type: 'enum',
        enum: ['light', 'dark'],
        default: 'light',
    })
    theme!: ThemeMode;
}