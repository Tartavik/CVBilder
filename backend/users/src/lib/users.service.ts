import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from './profile.entity';
import { SettingsEntity } from './settings.entity';
import { UserEntity } from './user.entity';

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

  async findAll(): Promise<UserEntity[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(email: string, passwordHash: string): Promise<UserEntity> {
    const user = this.userRepo.create({ email, passwordHash });
    return this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { email } });
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
    let profile = await this.profileRepo.findOne({ where: { user: { id: userId } } });

    if (profile) {
      Object.assign(profile, data);
    } else {
      profile = this.profileRepo.create({ ...data, user });
    }

    return this.profileRepo.save(profile);
  }

  async updateSettings(
    userId: string,
    data: { theme: 'light' | 'dark' },
  ): Promise<SettingsEntity> {
    const user = await this.findById(userId);
    let settings = await this.settingsRepo.findOne({ where: { user: { id: userId } } });

    if (settings) {
      Object.assign(settings, data);
    } else {
      settings = this.settingsRepo.create({ ...data, user });
    }

    return this.settingsRepo.save(settings);
  }
}
