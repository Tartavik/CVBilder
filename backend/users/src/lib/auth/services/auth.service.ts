import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { AuthUser } from '../auth.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BCRYPT_ROUNDS = 12;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async register(email: string, password: string): Promise<AuthUser> {
    this.validateCredentials(email, password);
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.userRepo.findOne({
      where: { email: normalizedEmail },
    });
    if (existing) throw new ConflictException('Email already in use');

    const user = this.userRepo.create({
      email: normalizedEmail,
      passwordHash: await hash(password, BCRYPT_ROUNDS),
    });

    try {
      return this.toAuthUser(await this.userRepo.save(user));
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthUser | null> {
    this.validateCredentials(email, password);
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', {
        email: this.normalizeEmail(email),
      })
      .getOne();
    if (!user) return null;

    const alreadyHashed = BCRYPT_HASH_PATTERN.test(user.passwordHash);
    const passwordMatches = alreadyHashed
      ? await compare(password, user.passwordHash)
      : user.passwordHash === password;
    if (!passwordMatches) return null;

    if (!alreadyHashed) {
      user.passwordHash = await hash(password, BCRYPT_ROUNDS);
      await this.userRepo.save(user);
    }

    return this.toAuthUser(user);
  }

  private validateCredentials(email: string, password: string): void {
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      throw new BadRequestException('Enter a valid email');
    }
    if (typeof password !== 'string' || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLocaleLowerCase();
  }

  private toAuthUser(user: UserEntity): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}
