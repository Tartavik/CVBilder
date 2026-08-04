import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';
import { CvEntity } from '../entities/cv.entity';
import { PersonalDetailEntity } from '../entities/personal-detail.entity';

const PHOTO_MIME_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

export interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class CvPhotoService {
  constructor(
    @InjectRepository(CvEntity)
    private readonly cvRepo: Repository<CvEntity>,
    @InjectRepository(PersonalDetailEntity)
    private readonly personalDetailRepo: Repository<PersonalDetailEntity>,
  ) {}

  async upload(
    userId: string,
    cvId: string,
    file?: UploadedPhoto,
  ): Promise<{ photoUrl: string }> {
    if (!file) throw new BadRequestException('Photo file is required');
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Photo must be 5 MB or smaller');
    }

    const extension = PHOTO_MIME_TYPES.get(file.mimetype);
    if (!extension) {
      throw new BadRequestException('Photo must be JPEG, PNG, or WebP');
    }

    await this.requireOwnedCv(userId, cvId);
    const photoDirectory = this.getPhotoDirectory();
    await mkdir(photoDirectory, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    await writeFile(join(photoDirectory, fileName), file.buffer);
    return { photoUrl: `/api/uploads/profile-photos/${fileName}` };
  }

  async delete(userId: string, cvId: string): Promise<{ success: true }> {
    await this.requireOwnedCv(userId, cvId);
    const personalDetail = await this.personalDetailRepo.findOne({
      where: { cv: { id: cvId } },
    });
    if (!personalDetail?.photoUrl) return { success: true };

    const previousPhotoUrl = personalDetail.photoUrl;
    personalDetail.photoUrl = null;
    await this.personalDetailRepo.save(personalDetail);
    await this.removePhotoFile(previousPhotoUrl);
    return { success: true };
  }

  normalizePhotoUrl(photoUrl: string | undefined): string | null {
    const normalized = photoUrl?.trim();
    if (!normalized) return null;
    if (!normalized.startsWith('/api/uploads/profile-photos/')) {
      throw new BadRequestException('Invalid CV photo');
    }
    const fileName = normalized.slice('/api/uploads/profile-photos/'.length);
    if (!fileName || fileName !== fileName.split(/[\\/]/).pop()) {
      throw new BadRequestException('Invalid CV photo');
    }
    return normalized;
  }

  async removePhotoFile(photoUrl: string | null): Promise<void> {
    if (!photoUrl?.startsWith('/api/uploads/profile-photos/')) return;

    const fileName = photoUrl.slice('/api/uploads/profile-photos/'.length);
    if (!fileName || fileName !== fileName.split(/[\\/]/).pop()) return;

    try {
      await unlink(join(this.getPhotoDirectory(), fileName));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }
  }

  private async requireOwnedCv(userId: string, cvId: string): Promise<void> {
    const cv = await this.cvRepo.findOne({
      where: { id: cvId, user: { id: userId } },
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);
  }

  private getPhotoDirectory(): string {
    return join(
      process.cwd(),
      process.env.UPLOAD_DIR || 'uploads',
      'profile-photos',
    );
  }
}
