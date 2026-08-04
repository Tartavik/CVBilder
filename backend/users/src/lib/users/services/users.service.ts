import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../../auth/auth.types';
import { ProfileEntity } from '../entities/profile.entity';
import { SettingsEntity } from '../entities/settings.entity';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepo: Repository<ProfileEntity>,
    @InjectRepository(SettingsEntity)
    private readonly settingsRepo: Repository<SettingsEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findAll(): Promise<AuthUser[]> {
    const users = await this.userRepo.find({ order: { createdAt: 'DESC' } });
    return users.map((user) => this.toAuthUser(user));
  }

  async getProfile(userId: string): Promise<ProfileEntity | null> {
    return this.profileRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async getSettings(userId: string): Promise<SettingsEntity | null> {
    return this.settingsRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async updateProfile(
    userId: string,
    data: { firstName: string; lastName: string; location?: string | null },
  ): Promise<ProfileEntity> {
    const user = await this.findById(userId);
    let profile = await this.profileRepo.findOne({
      where: { user: { id: userId } },
    });

    if (profile) Object.assign(profile, data);
    else profile = this.profileRepo.create({ ...data, user });
    return this.profileRepo.save(profile);
  }

  async updateSettings(
    userId: string,
    data: { theme: 'light' | 'dark' },
  ): Promise<SettingsEntity> {
    const user = await this.findById(userId);
    let settings = await this.settingsRepo.findOne({
      where: { user: { id: userId } },
    });

    if (settings) Object.assign(settings, data);
    else settings = this.settingsRepo.create({ ...data, user });
    return this.settingsRepo.save(settings);
  }

  toAuthUser(user: UserEntity): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
