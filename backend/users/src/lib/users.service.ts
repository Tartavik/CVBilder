import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { In, Repository } from 'typeorm';
import { ProfileEntity } from './profile.entity';
import { SettingsEntity } from './settings.entity';
import { UserEntity } from './user.entity';
import { CvEntity } from './cv.entity';
import { ExperienceEntity } from './experience.entity';
import { EducationEntity } from './education.entity';
import { GeneralSkillEntity } from './general-skill.entity';
import { ExperienceSkillEntity } from './experience-skill.entity';
import { UserSkillEntity } from './user-skill.entity';
import { PersonalDetailEntity } from './personalDetail.entity';
import { AiIconService } from './ai-icon.service';
import {
  AdditionalSectionItemDto,
  EducationItemDto,
  ExperienceItemDto,
  ExperienceSkillDto,
  PersonalDataDto,
  SaveCvDto,
} from './dto/save-cv.dto';
import { compare, hash } from 'bcryptjs';
import { AuthUser } from './auth.types';

const DEFAULT_SECTION_ORDER = [
  'personal',
  'experience',
  'education',
  'skills',
  'additional',
  'details',
];
const VALID_SECTION_IDS = new Set(DEFAULT_SECTION_ORDER);
const ADDITIONAL_SECTION_TYPES = new Set([
  'language',
  'project',
  'certification',
  'link',
  'award',
  'volunteering',
  'publication',
  'license',
  'membership',
  'reference',
  'careerBreak',
  'custom',
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;
const SHORT_TEXT_PATTERN = /^[\p{L}][\p{L} .,'+#&-]*$/u;
const CV_MIN_TEXT_LENGTH = 2;
const CV_FIELD_LIMITS = {
  shortText: 120,
  longText: 500,
  email: 120,
  phone: 16,
  skill: 50,
  url: 2048,
} as const;
const PHOTO_MIME_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const BCRYPT_ROUNDS = 12;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(ProfileEntity)
    private readonly profileRepo: Repository<ProfileEntity>,

    @InjectRepository(SettingsEntity)
    private readonly settingsRepo: Repository<SettingsEntity>,

    @InjectRepository(CvEntity)
    private readonly cvRepo: Repository<CvEntity>,

    @InjectRepository(ExperienceEntity)
    private readonly experienceRepo: Repository<ExperienceEntity>,

    @InjectRepository(EducationEntity)
    private readonly educationRepo: Repository<EducationEntity>,

    @InjectRepository(GeneralSkillEntity)
    private readonly generalSkillRepo: Repository<GeneralSkillEntity>,

    @InjectRepository(ExperienceSkillEntity)
    private readonly experienceSkillRepo: Repository<ExperienceSkillEntity>,

    @InjectRepository(UserSkillEntity)
    private readonly userSkillRepo: Repository<UserSkillEntity>,

    @InjectRepository(PersonalDetailEntity)
    private readonly personalDetailRepo: Repository<PersonalDetailEntity>,

    private readonly aiIconService: AiIconService,
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

  async create(email: string, password: string): Promise<AuthUser> {
    this.validateCredentials(email, password);
    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      email: this.normalizeEmail(email),
      passwordHash,
    });
    return this.toAuthUser(await this.userRepo.save(user));
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    if (typeof email !== 'string') return null;
    return this.userRepo.findOne({
      where: { email: this.normalizeEmail(email) },
    });
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
    let settings = await this.settingsRepo.findOne({
      where: { user: { id: userId } },
    });

    if (settings) {
      Object.assign(settings, data);
    } else {
      settings = this.settingsRepo.create({ ...data, user });
    }

    return this.settingsRepo.save(settings);
  }

  async getUserSkills(
    userId: string,
  ): Promise<Array<{ name: string; icon: string | null; hidden: boolean }>> {
    const user = await this.findById(userId);
    try {
      const skills = await this.userSkillRepo.find({
        where: { user: { id: user.id } },
        order: { name: 'ASC' },
      });
      return skills.map((skill) => ({
        name: skill.name,
        icon: skill.icon,
        hidden: skill.hidden,
      }));
    } catch (error) {
      if (this.isMissingUserSkillsTable(error)) return [];
      throw error;
    }
  }

  async deleteUserSkill(
    userId: string,
    skillName?: string,
  ): Promise<{ success: true }> {
    const trimmedName = skillName?.trim();
    if (!trimmedName) {
      throw new BadRequestException('Skill name is required');
    }
    if (trimmedName.length > CV_FIELD_LIMITS.skill) {
      throw new BadRequestException(
        `Skill name must be ${CV_FIELD_LIMITS.skill} characters or fewer`,
      );
    }

    const user = await this.findById(userId);
    const userSkills = await this.userSkillRepo.find({
      where: { user: { id: user.id } },
    });
    const existingSkill = userSkills.find(
      (skill) =>
        skill.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
    );

    if (existingSkill) {
      existingSkill.hidden = true;
      await this.userSkillRepo.save(existingSkill);
    } else {
      await this.userSkillRepo.save(
        this.userSkillRepo.create({
          user,
          name: trimmedName,
          icon: null,
          hidden: true,
        }),
      );
    }

    return { success: true };
  }

  async getUserCvLibrary(userId: string, cvId?: string) {
    if (cvId) {
      const cv = await this.cvRepo.findOne({
        where: { id: cvId, user: { id: userId } },
      });
      if (!cv) throw new NotFoundException(`CV ${cvId} not found`);
    } else {
      await this.findById(userId);
    }

    const experienceQuery = this.experienceRepo
      .createQueryBuilder('experience')
      .innerJoin('experience.cv', 'cv')
      .innerJoin('cv.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('experience.createdAt', 'DESC');
    const educationQuery = this.educationRepo
      .createQueryBuilder('education')
      .innerJoin('education.cv', 'cv')
      .innerJoin('cv.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('education.createdAt', 'DESC');

    if (cvId) {
      experienceQuery.andWhere('cv.id != :cvId', { cvId });
      educationQuery.andWhere('cv.id != :cvId', { cvId });
    }

    const [experiences, education] = await Promise.all([
      experienceQuery.getMany(),
      educationQuery.getMany(),
    ]);

    const experienceSkills = experiences.length
      ? await this.experienceSkillRepo.find({
          where: { experience: { id: In(experiences.map((item) => item.id)) } },
          relations: ['experience'],
          order: { createdAt: 'ASC' },
        })
      : [];
    const skillsByExperience = new Map<
      string,
      Array<{ name: string; icon: string | null }>
    >();
    experienceSkills.forEach((skill) => {
      const skills = skillsByExperience.get(skill.experience.id) ?? [];
      skills.push({ name: skill.name, icon: skill.icon });
      skillsByExperience.set(skill.experience.id, skills);
    });

    const uniqueExperiences = new Map<
      string,
      {
        id: string;
        company: string;
        position: string;
        startDate: string;
        endDate: string;
        current: boolean;
        description: string;
        skills: Array<{ name: string; icon: string | null }>;
      }
    >();
    experiences.forEach((experience) => {
      const startDate = this.toDateOnly(experience.startDate);
      const endDate = this.toDateOnly(experience.endDate);
      const key = this.createLibraryKey([
        experience.companyName,
        experience.position,
        startDate,
        endDate,
      ]);
      if (uniqueExperiences.has(key)) return;
      uniqueExperiences.set(key, {
        id: experience.id,
        company: experience.companyName,
        position: experience.position,
        startDate,
        endDate,
        current: !experience.endDate,
        description: experience.description || '',
        skills: skillsByExperience.get(experience.id) ?? [],
      });
    });

    const uniqueEducation = new Map<
      string,
      {
        id: string;
        institution: string;
        degree: string;
        field: string;
        year: string;
      }
    >();
    education.forEach((item) => {
      const year = item.graduationYear?.toString() || '';
      const key = this.createLibraryKey([
        item.name,
        item.degree,
        item.description || '',
        year,
      ]);
      if (uniqueEducation.has(key)) return;
      uniqueEducation.set(key, {
        id: item.id,
        institution: item.name,
        degree: item.degree,
        field: item.description || '',
        year,
      });
    });

    return {
      experience: [...uniqueExperiences.values()],
      education: [...uniqueEducation.values()],
    };
  }

  async getUserCvs(userId: string) {
    await this.findById(userId);
    const cvs = await this.cvRepo.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { updatedAt: 'DESC' },
    });
    return cvs.map((cv) => this.toCvSummary(cv, cv.user));
  }

  async getUserCv(userId: string, cvId: string) {
    const cv = await this.cvRepo.findOne({
      where: { id: cvId, user: { id: userId } },
      relations: ['user'],
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);
    return this.getCvData(cv);
  }

  async getPublicCv(cvId: string) {
    const cv = await this.cvRepo.findOne({
      where: { id: cvId, isPublished: true },
      relations: ['user'],
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);
    return this.getCvData(cv);
  }

  async saveCv(userId: string, cvId: string, dto: SaveCvDto) {
    return this.persistCv(userId, cvId, dto, false);
  }

  async createCvFromDraft(userId: string, cvId: string, dto: SaveCvDto) {
    return this.persistCv(userId, cvId, dto, true);
  }

  async setCvPublication(
    userId: string,
    cvId: string,
    isPublished?: boolean,
  ): Promise<{ isPublished: boolean }> {
    if (typeof isPublished !== 'boolean') {
      throw new BadRequestException('isPublished must be a boolean');
    }

    const cv = await this.cvRepo.findOne({
      where: { id: cvId, user: { id: userId } },
      relations: ['user'],
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);

    if (isPublished) {
      const cvData = await this.getCvData(cv);
      this.validateCvForPublication({
        ...cvData,
        additionalSections: cvData.additionalSections.map((item) => ({
          ...item,
          type: item['type'] ?? '',
          title: item['title'] ?? '',
        })),
      });
    }

    cv.isPublished = isPublished;
    await this.cvRepo.save(cv);
    return { isPublished: cv.isPublished };
  }

  async deleteCv(userId: string, cvId: string): Promise<{ success: true }> {
    const cv = await this.cvRepo.findOne({
      where: { id: cvId, user: { id: userId } },
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);

    const personalDetail = await this.personalDetailRepo.findOne({
      where: { cv: { id: cvId } },
    });
    const photoUrl = personalDetail?.photoUrl ?? null;

    await this.cvRepo.remove(cv);
    await this.removePhotoFile(photoUrl);
    return { success: true };
  }

  private async persistCv(
    userId: string,
    cvId: string,
    dto: SaveCvDto,
    createNew: boolean,
  ) {
    this.validateCvDraft(dto);
    const sectionOrder = this.normalizeSectionOrder(dto.sectionOrder);
    const template = dto.template ?? 'single';
    let obsoletePhotoUrl: string | null = null;

    const result = await this.cvRepo.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      const cvRepo = manager.getRepository(CvEntity);
      const personalDetailRepo = manager.getRepository(PersonalDetailEntity);
      const experienceRepo = manager.getRepository(ExperienceEntity);
      const experienceSkillRepo = manager.getRepository(ExperienceSkillEntity);
      const userSkillRepo = manager.getRepository(UserSkillEntity);
      const educationRepo = manager.getRepository(EducationEntity);
      const generalSkillRepo = manager.getRepository(GeneralSkillEntity);

      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException(`User ${userId} not found`);

      let cv = await cvRepo.findOne({
        where: { id: cvId, user: { id: userId } },
      });
      if (createNew && cv) {
        throw new ConflictException(`CV ${cvId} already exists`);
      }
      if (!cv && createNew) {
        cv = cvRepo.create({
          id: cvId,
          user,
          title: 'Untitled CV',
          template,
          experienceSkillMode: 'text',
          sectionOrder: [...DEFAULT_SECTION_ORDER],
          additionalSections: [],
        });
      }
      if (!cv) throw new NotFoundException(`CV ${cvId} not found`);

      cv.title = this.getCvTitle(dto, cv.title);
      cv.template = template;
      cv.experienceSkillMode = dto.experienceSkillMode ?? 'text';
      cv.sectionOrder = sectionOrder;
      cv.additionalSections = this.normalizeAdditionalSections(
        dto.additionalSections ?? [],
      );
      if (cv.isPublished && !this.isCvReady(dto)) {
        cv.isPublished = false;
      }
      cv = await cvRepo.save(cv);

      const personal = dto.personal;
      let personalDetail = await personalDetailRepo.findOne({
        where: { cv: { id: cv.id } },
      });
      const hasPhotoDraft = Object.prototype.hasOwnProperty.call(
        personal,
        'photo',
      );
      const currentPhotoUrl = personalDetail?.photoUrl ?? null;
      const nextPhotoUrl = hasPhotoDraft
        ? this.normalizeCvPhotoUrl(personal.photo)
        : currentPhotoUrl;
      if (currentPhotoUrl && currentPhotoUrl !== nextPhotoUrl) {
        obsoletePhotoUrl = currentPhotoUrl;
      }
      const personalValues = {
        fullName: personal.fullName,
        jobTitle: personal.jobTitle,
        email: personal.email,
        phoneNumber: personal.phone,
        address: personal.city,
        summary: personal.summary,
        photoUrl: nextPhotoUrl,
      };

      if (personalDetail) {
        Object.assign(personalDetail, personalValues);
      } else {
        personalDetail = personalDetailRepo.create({
          cv,
          ...personalValues,
        });
      }
      await personalDetailRepo.save(personalDetail);

      await experienceRepo.delete({ cv: { id: cv.id } });
      const experiences = dto.experience.map((exp, index) =>
        experienceRepo.create({
          cv,
          companyName: exp.company,
          position: exp.position,
          startDate: exp.startDate
            ? this.parseDate(exp.startDate, `experience[${index}].startDate`)
            : null,
          endDate: exp.current
            ? null
            : exp.endDate
              ? this.parseDate(exp.endDate, `experience[${index}].endDate`)
              : null,
          isCurrent: exp.current ?? false,
          description: exp.description,
        }),
      );
      const savedExperiences = experiences.length
        ? await experienceRepo.save(experiences)
        : [];
      const experienceSkills = savedExperiences.flatMap((experience, index) =>
        this.normalizeExperienceSkills(dto.experience[index].skills ?? []).map(
          (skill) =>
            experienceSkillRepo.create({
              experience,
              name: skill.name,
              icon: skill.icon,
            }),
        ),
      );
      if (experienceSkills.length) {
        await experienceSkillRepo.save(experienceSkills);
      }

      await educationRepo.delete({ cv: { id: cv.id } });
      const education = dto.education.map((edu) =>
        educationRepo.create({
          cv,
          name: edu.institution,
          degree: edu.degree,
          graduationYear: edu.year ? Number(edu.year) : null,
          description: edu.field,
        }),
      );
      if (education.length) await educationRepo.save(education);

      await generalSkillRepo.delete({ cv: { id: cv.id } });
      const generalSkills = this.normalizeSkillNames(
        dto.generalSkills ?? [],
      ).map((name) => generalSkillRepo.create({ cv, name }));
      if (generalSkills.length) await generalSkillRepo.save(generalSkills);

      await this.upsertUserSkills(
        userSkillRepo,
        user,
        dto.generalSkills ?? [],
        dto.experience.flatMap((experience) => experience.skills ?? []),
      );

      return {
        success: true,
        cvId: cv.id,
        isPublished: cv.isPublished,
      };
    });

    await this.removePhotoFile(obsoletePhotoUrl);
    return result;
  }

  private async getCvData(cv: CvEntity) {
    const [
      personalDetails,
      experiences,
      experienceSkills,
      education,
      generalSkills,
    ] = await Promise.all([
      this.personalDetailRepo.find({ where: { cv: { id: cv.id } } }),
      this.experienceRepo.find({
        where: { cv: { id: cv.id } },
        order: { createdAt: 'DESC' },
      }),
      this.experienceSkillRepo.find({
        where: { experience: { cv: { id: cv.id } } },
        relations: ['experience'],
        order: { createdAt: 'ASC' },
      }),
      this.educationRepo.find({
        where: { cv: { id: cv.id } },
        order: { createdAt: 'DESC' },
      }),
      this.generalSkillRepo.find({
        where: { cv: { id: cv.id } },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const personal = personalDetails[0];
    const skillsByExperience = new Map<
      string,
      Array<{ name: string; icon: string | null }>
    >();
    experienceSkills.forEach((skill) => {
      const skills = skillsByExperience.get(skill.experience.id) ?? [];
      skills.push({ name: skill.name, icon: skill.icon });
      skillsByExperience.set(skill.experience.id, skills);
    });

    return {
      id: cv.id,
      title: cv.title,
      ownerEmail: cv.user.email,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt,
      isPublished: cv.isPublished,
      personal: {
        fullName: personal?.fullName || '',
        jobTitle: personal?.jobTitle || '',
        email: personal?.email || '',
        phone: personal?.phoneNumber || '',
        city: personal?.address || '',
        summary: personal?.summary || '',
        photo: personal?.photoUrl || '',
      },
      experience: experiences.map((experience) => ({
        id: experience.id,
        company: experience.companyName,
        position: experience.position,
        startDate: experience.startDate?.toString() || '',
        endDate: experience.endDate?.toString() || '',
        description: experience.description || '',
        current: experience.isCurrent,
        skills: skillsByExperience.get(experience.id) ?? [],
      })),
      education: education.map((item) => ({
        id: item.id,
        institution: item.name,
        degree: item.degree,
        field: item.description || '',
        year: item.graduationYear?.toString() || '',
      })),
      additionalSections: cv.additionalSections ?? [],
      generalSkills: generalSkills.map((skill) => skill.name),
      experienceSkillMode: cv.experienceSkillMode,
      sectionOrder: cv.sectionOrder,
      template: cv.template,
    };
  }

  async generateSkillIcon(
    userId: string,
    cvId: string,
    skillName?: string,
  ): Promise<{ icon: string; source: 'generated' | 'found' }> {
    const cv = await this.cvRepo.findOne({
      where: { id: cvId, user: { id: userId } },
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);

    return this.generateUserSkillIcon(userId, skillName);
  }

  async generateUserSkillIcon(
    userId: string,
    skillName?: string,
  ): Promise<{ icon: string; source: 'generated' | 'found' }> {
    const trimmedName = skillName?.trim();
    if (!trimmedName) {
      throw new BadRequestException('Skill name is required');
    }
    if (trimmedName.length > CV_FIELD_LIMITS.skill) {
      throw new BadRequestException(
        `Skill name must be ${CV_FIELD_LIMITS.skill} characters or fewer`,
      );
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const existingSkill = await this.userSkillRepo.findOne({
      where: { user: { id: userId }, name: trimmedName },
    });
    if (existingSkill?.icon) {
      if (existingSkill.hidden) {
        existingSkill.hidden = false;
        await this.userSkillRepo.save(existingSkill);
      }
      return { icon: existingSkill.icon, source: 'found' };
    }

    const { icon, source } = await this.aiIconService.findOrGenerateIcon(
      userId,
      trimmedName,
    );
    await this.upsertUserSkills(
      this.userSkillRepo,
      user,
      [],
      [{ name: trimmedName, icon }],
    );
    return { icon, source };
  }

  async uploadCvPhoto(
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

    const cv = await this.cvRepo.findOne({
      where: { id: cvId, user: { id: userId } },
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);

    const photoDirectory = this.getPhotoDirectory();
    await mkdir(photoDirectory, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    const filePath = join(photoDirectory, fileName);

    await writeFile(filePath, file.buffer);
    return { photoUrl: `/api/uploads/profile-photos/${fileName}` };
  }

  async deleteCvPhoto(
    userId: string,
    cvId: string,
  ): Promise<{ success: true }> {
    const cv = await this.cvRepo.findOne({
      where: { id: cvId, user: { id: userId } },
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);

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

  private toCvSummary(cv: CvEntity, user: UserEntity) {
    return {
      id: cv.id,
      title: cv.title,
      ownerEmail: user.email,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt,
      isPublished: cv.isPublished,
    };
  }

  private getCvTitle(dto: SaveCvDto, currentTitle: string): string {
    return (
      dto.personal.fullName?.trim() ||
      dto.personal.jobTitle?.trim() ||
      currentTitle ||
      'Untitled CV'
    );
  }

  private validateCvForPublication(dto: SaveCvDto): void {
    this.validateCvDraft(dto);
    this.validatePersonal(dto.personal);
    dto.experience.forEach((experience, index) =>
      this.validateExperience(experience, index),
    );
    dto.education.forEach((education, index) =>
      this.validateEducation(education, index),
    );
    dto.additionalSections?.forEach((item, index) =>
      this.validateAdditionalSection(item, index),
    );
  }

  private validateCvDraft(dto: SaveCvDto): void {
    if (
      !dto?.personal ||
      typeof dto.personal !== 'object' ||
      Array.isArray(dto.personal) ||
      !Array.isArray(dto.experience) ||
      !Array.isArray(dto.education) ||
      (dto.additionalSections !== undefined &&
        !Array.isArray(dto.additionalSections)) ||
      (dto.generalSkills !== undefined && !Array.isArray(dto.generalSkills)) ||
      (dto.sectionOrder !== undefined && !Array.isArray(dto.sectionOrder))
    ) {
      throw new BadRequestException('Invalid CV payload');
    }

    if (dto.template && !['single', 'classic'].includes(dto.template)) {
      throw new BadRequestException('Invalid CV template');
    }
    if (
      dto.experienceSkillMode &&
      !['text', 'icons'].includes(dto.experienceSkillMode)
    ) {
      throw new BadRequestException('Invalid experience skill mode');
    }

    if (
      dto.sectionOrder?.some(
        (section) =>
          typeof section !== 'string' || !VALID_SECTION_IDS.has(section),
      )
    ) {
      throw new BadRequestException('Invalid CV section order');
    }

    this.validateDraftPersonal(dto.personal);
    dto.experience.forEach((experience, index) =>
      this.validateDraftExperience(experience, index),
    );
    dto.education.forEach((education, index) =>
      this.validateDraftEducation(education, index),
    );
    dto.additionalSections?.forEach((item, index) =>
      this.validateDraftAdditionalSection(item, index),
    );
    this.validateSkillNames(dto.generalSkills ?? [], 'General skills');
  }

  private validateDraftPersonal(personal: PersonalDataDto): void {
    const fields: Array<[keyof PersonalDataDto, string, number]> = [
      ['fullName', 'Full name', CV_FIELD_LIMITS.shortText],
      ['jobTitle', 'Job title', CV_FIELD_LIMITS.shortText],
      ['email', 'Email', CV_FIELD_LIMITS.email],
      ['phone', 'Phone', CV_FIELD_LIMITS.phone],
      ['city', 'City', CV_FIELD_LIMITS.shortText],
      ['summary', 'Summary', CV_FIELD_LIMITS.longText],
    ];

    fields.forEach(([field, label, maxLength]) =>
      this.validateDraftString(personal[field], label, maxLength),
    );
    this.validateOptionalDraftString(
      personal.photo,
      'Photo URL',
      CV_FIELD_LIMITS.url,
    );
  }

  private validateDraftExperience(
    experience: ExperienceItemDto,
    index: number,
  ): void {
    if (!experience || typeof experience !== 'object') {
      throw new BadRequestException(`Experience ${index + 1} is invalid`);
    }
    this.validateDraftString(
      experience.company,
      `Experience ${index + 1} company`,
      CV_FIELD_LIMITS.shortText,
    );
    this.validateDraftString(
      experience.position,
      `Experience ${index + 1} position`,
      CV_FIELD_LIMITS.shortText,
    );
    this.validateDraftString(
      experience.startDate,
      `Experience ${index + 1} start date`,
      10,
    );
    this.validateOptionalDraftString(
      experience.endDate,
      `Experience ${index + 1} end date`,
      10,
    );
    this.validateOptionalDraftString(
      experience.description,
      `Experience ${index + 1} description`,
      CV_FIELD_LIMITS.longText,
    );
    if (
      experience.current !== undefined &&
      typeof experience.current !== 'boolean'
    ) {
      throw new BadRequestException(
        `Experience ${index + 1} current must be a boolean`,
      );
    }
    if (experience.startDate) {
      this.parseDate(experience.startDate, `experience[${index}].startDate`);
    }
    if (experience.endDate) {
      this.parseDate(experience.endDate, `experience[${index}].endDate`);
    }
    if (
      experience.skills !== undefined &&
      (!Array.isArray(experience.skills) ||
        experience.skills.some(
          (skill) =>
            !skill ||
            typeof skill !== 'object' ||
            typeof skill.name !== 'string' ||
            !skill.name.trim() ||
            skill.name.trim().length > CV_FIELD_LIMITS.skill ||
            (skill.icon !== undefined &&
              skill.icon !== null &&
              typeof skill.icon !== 'string'),
        ))
    ) {
      throw new BadRequestException(
        `experience[${index}].skills must contain valid skill objects`,
      );
    }
  }

  private validateDraftEducation(
    education: EducationItemDto,
    index: number,
  ): void {
    if (!education || typeof education !== 'object') {
      throw new BadRequestException(`Education ${index + 1} is invalid`);
    }
    this.validateDraftString(
      education.institution,
      `Education ${index + 1} institution`,
      CV_FIELD_LIMITS.shortText,
    );
    this.validateDraftString(
      education.degree,
      `Education ${index + 1} degree`,
      CV_FIELD_LIMITS.shortText,
    );
    this.validateDraftString(
      education.field,
      `Education ${index + 1} field`,
      CV_FIELD_LIMITS.shortText,
    );
    this.validateDraftString(education.year, `Education ${index + 1} year`, 4);
    if (education.year && !/^\d{1,4}$/.test(education.year)) {
      throw new BadRequestException(
        `education[${index}].year must contain up to four digits`,
      );
    }
  }

  private validateDraftAdditionalSection(
    item: AdditionalSectionItemDto,
    index: number,
  ): void {
    if (!item || !ADDITIONAL_SECTION_TYPES.has(item.type)) {
      throw new BadRequestException(
        `Additional section ${index + 1} has an invalid type`,
      );
    }
    this.validateDraftString(
      item.title,
      `Additional section ${index + 1} title`,
      CV_FIELD_LIMITS.shortText,
    );
    const fields: Array<[string | undefined, string, number]> = [
      [
        item.sectionTitle,
        `Additional section ${index + 1} section name`,
        CV_FIELD_LIMITS.shortText,
      ],
      [
        item.subtitle,
        `Additional section ${index + 1} subtitle`,
        CV_FIELD_LIMITS.shortText,
      ],
      [
        item.description,
        `Additional section ${index + 1} description`,
        CV_FIELD_LIMITS.longText,
      ],
      [
        item.location,
        `Additional section ${index + 1} location`,
        CV_FIELD_LIMITS.shortText,
      ],
      [
        item.level,
        `Additional section ${index + 1} level`,
        CV_FIELD_LIMITS.shortText,
      ],
      [item.url, `Additional section ${index + 1} URL`, CV_FIELD_LIMITS.url],
      [item.startDate, `Additional section ${index + 1} start date`, 10],
      [item.endDate, `Additional section ${index + 1} end date`, 10],
    ];
    fields.forEach(([value, label, maxLength]) =>
      this.validateOptionalDraftString(value, label, maxLength),
    );

    if (item.startDate) {
      this.parseDate(item.startDate, `additionalSections[${index}].startDate`);
    }
    if (item.endDate) {
      this.parseDate(item.endDate, `additionalSections[${index}].endDate`);
    }
  }

  private validateDraftString(
    value: unknown,
    label: string,
    maxLength: number,
  ): void {
    if (typeof value !== 'string' || value.length > maxLength) {
      throw new BadRequestException(
        `${label} must be ${maxLength} characters or fewer`,
      );
    }
  }

  private validateOptionalDraftString(
    value: unknown,
    label: string,
    maxLength: number,
  ): void {
    if (value === undefined) return;
    this.validateDraftString(value, label, maxLength);
  }

  private isCvReady(dto: SaveCvDto): boolean {
    try {
      this.validateCvForPublication(dto);
      return true;
    } catch (error) {
      if (error instanceof BadRequestException) return false;
      throw error;
    }
  }

  private validatePersonal(personal: PersonalDataDto): void {
    const requiredFields: Array<
      [keyof PersonalDataDto, string, boolean, number]
    > = [
      ['fullName', 'Full name', true, CV_FIELD_LIMITS.shortText],
      ['jobTitle', 'Job title', true, CV_FIELD_LIMITS.shortText],
      ['email', 'Email', false, CV_FIELD_LIMITS.email],
      ['phone', 'Phone', false, CV_FIELD_LIMITS.phone],
      ['city', 'City', true, CV_FIELD_LIMITS.shortText],
      ['summary', 'Summary', false, CV_FIELD_LIMITS.longText],
    ];

    for (const [field, label, validateText, maxLength] of requiredFields) {
      this.validateRequiredString(personal[field], label, {
        validateText,
        maxLength,
      });
    }

    if (!EMAIL_PATTERN.test(personal.email.trim())) {
      throw new BadRequestException('Enter a valid email');
    }
    if (!PHONE_PATTERN.test(personal.phone.trim())) {
      throw new BadRequestException(
        'Phone must start with + and contain 7-15 digits',
      );
    }
  }

  private validateExperience(
    experience: ExperienceItemDto,
    index: number,
  ): void {
    if (
      !this.isValidShortText(experience.company) ||
      !this.isValidShortText(experience.position)
    ) {
      throw new BadRequestException(
        `Experience ${index + 1} requires company and position`,
      );
    }
    const startDate = this.parseDate(
      experience.startDate,
      `experience[${index}].startDate`,
    );
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (startDate > today) {
      throw new BadRequestException(
        `Experience ${index + 1} start date cannot be in the future`,
      );
    }
    if (!experience.current) {
      if (
        typeof experience.endDate !== 'string' ||
        !experience.endDate.trim()
      ) {
        throw new BadRequestException(
          `Experience ${index + 1} requires end date`,
        );
      }
      const endDate = this.parseDate(
        experience.endDate,
        `experience[${index}].endDate`,
      );
      if (endDate < startDate) {
        throw new BadRequestException(
          `Experience ${index + 1} end date cannot be before start date`,
        );
      }
    }
    if (
      typeof experience.description !== 'string' ||
      experience.description.trim().length < CV_MIN_TEXT_LENGTH ||
      experience.description.trim().length > CV_FIELD_LIMITS.longText
    ) {
      throw new BadRequestException(
        `Experience ${index + 1} description must be ${CV_MIN_TEXT_LENGTH}-${CV_FIELD_LIMITS.longText} characters`,
      );
    }
    if (
      experience.skills !== undefined &&
      (!Array.isArray(experience.skills) ||
        experience.skills.some(
          (skill) =>
            !skill ||
            typeof skill.name !== 'string' ||
            !skill.name.trim() ||
            skill.name.trim().length > CV_FIELD_LIMITS.skill ||
            (skill.icon !== undefined &&
              skill.icon !== null &&
              typeof skill.icon !== 'string'),
        ))
    ) {
      throw new BadRequestException(
        `experience[${index}].skills must contain valid skill objects`,
      );
    }
  }

  private validateEducation(education: EducationItemDto, index: number): void {
    if (
      !this.isValidShortText(education.institution) ||
      !this.isValidShortText(education.degree) ||
      !this.isValidShortText(education.field)
    ) {
      throw new BadRequestException(
        `Education ${index + 1} requires all fields`,
      );
    }
    this.parseYear(education.year, index);
  }

  private validateAdditionalSection(
    item: AdditionalSectionItemDto,
    index: number,
  ): void {
    if (!item || !ADDITIONAL_SECTION_TYPES.has(item.type)) {
      throw new BadRequestException(
        `Additional section ${index + 1} has an invalid type`,
      );
    }
    if (
      typeof item.title !== 'string' ||
      item.title.trim().length < CV_MIN_TEXT_LENGTH ||
      item.title.trim().length > CV_FIELD_LIMITS.shortText
    ) {
      throw new BadRequestException(
        `Additional section ${index + 1} requires a title`,
      );
    }
    if (
      item.type === 'custom' &&
      (typeof item.sectionTitle !== 'string' ||
        item.sectionTitle.trim().length < CV_MIN_TEXT_LENGTH ||
        item.sectionTitle.trim().length > CV_FIELD_LIMITS.shortText)
    ) {
      throw new BadRequestException(
        `Additional section ${index + 1} requires a section name`,
      );
    }
    if (
      item.type === 'language' &&
      (typeof item.level !== 'string' || !item.level.trim())
    ) {
      throw new BadRequestException(
        `Additional section ${index + 1} requires a language level`,
      );
    }
    if (
      item.type === 'link' &&
      (typeof item.url !== 'string' || !item.url.trim())
    ) {
      throw new BadRequestException(
        `Additional section ${index + 1} requires a URL`,
      );
    }
    this.validateOptionalMaxLength(
      item.sectionTitle,
      `Additional section ${index + 1} section name`,
      CV_FIELD_LIMITS.shortText,
    );
    this.validateOptionalMaxLength(
      item.subtitle,
      `Additional section ${index + 1} subtitle`,
      CV_FIELD_LIMITS.shortText,
    );
    this.validateOptionalMaxLength(
      item.description,
      `Additional section ${index + 1} description`,
      CV_FIELD_LIMITS.longText,
    );
    this.validateOptionalMaxLength(
      item.location,
      `Additional section ${index + 1} location`,
      CV_FIELD_LIMITS.shortText,
    );
    this.validateOptionalMaxLength(
      item.level,
      `Additional section ${index + 1} level`,
      CV_FIELD_LIMITS.shortText,
    );
    this.validateOptionalMaxLength(
      item.url,
      `Additional section ${index + 1} URL`,
      CV_FIELD_LIMITS.url,
    );
    if (item.url?.trim()) this.validateHttpUrl(item.url, index);
  }

  private validateHttpUrl(value: string, index: number): void {
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      throw new BadRequestException(
        `Additional section ${index + 1} contains an invalid URL`,
      );
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException(
        `Additional section ${index + 1} URL must use HTTP or HTTPS`,
      );
    }
  }

  private validateCredentials(email: string, password: string): void {
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      throw new BadRequestException('Enter a valid email');
    }
    if (typeof password !== 'string' || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
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

  private normalizeEmail(email: string): string {
    return email.trim().toLocaleLowerCase();
  }

  private validateRequiredString(
    value: string,
    label: string,
    options: { validateText?: boolean; maxLength?: number } = {},
  ): void {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${label} is required`);
    }
    if (value.trim().length < CV_MIN_TEXT_LENGTH) {
      throw new BadRequestException(
        `${label} must be at least ${CV_MIN_TEXT_LENGTH} characters`,
      );
    }
    if (
      options.maxLength !== undefined &&
      value.trim().length > options.maxLength
    ) {
      throw new BadRequestException(
        `${label} must be ${options.maxLength} characters or fewer`,
      );
    }
    if (
      options.validateText !== false &&
      !SHORT_TEXT_PATTERN.test(value.trim())
    ) {
      throw new BadRequestException(`${label} contains unsupported characters`);
    }
  }

  private isValidShortText(value: string): boolean {
    return (
      typeof value === 'string' &&
      value.trim().length >= CV_MIN_TEXT_LENGTH &&
      value.trim().length <= CV_FIELD_LIMITS.shortText &&
      SHORT_TEXT_PATTERN.test(value.trim())
    );
  }

  private validateOptionalMaxLength(
    value: string | undefined,
    label: string,
    maxLength: number,
  ): void {
    if (value === undefined || value === '') return;
    if (typeof value !== 'string' || value.trim().length > maxLength) {
      throw new BadRequestException(
        `${label} must be ${maxLength} characters or fewer`,
      );
    }
  }

  private validateSkillNames(skills: string[], label: string): void {
    if (
      skills.some(
        (skill) =>
          typeof skill !== 'string' ||
          !skill.trim() ||
          skill.trim().length > CV_FIELD_LIMITS.skill,
      )
    ) {
      throw new BadRequestException(
        `${label} must contain names up to ${CV_FIELD_LIMITS.skill} characters`,
      );
    }
  }

  private parseDate(value: string, field: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} must use YYYY-MM-DD format`);
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${field} is not a valid date`);
    }
    return date;
  }

  private parseYear(value: string, index: number): number {
    if (!/^\d{4}$/.test(value)) {
      throw new BadRequestException(
        `education[${index}].year must be a four-digit year`,
      );
    }
    return Number(value);
  }

  private normalizeSectionOrder(sectionOrder?: string[]): string[] {
    if (!sectionOrder?.length) return [...DEFAULT_SECTION_ORDER];

    const uniqueOrder = sectionOrder.filter(
      (section, index) =>
        VALID_SECTION_IDS.has(section) &&
        sectionOrder.indexOf(section) === index,
    );
    return [
      ...uniqueOrder,
      ...DEFAULT_SECTION_ORDER.filter(
        (section) => !uniqueOrder.includes(section),
      ),
    ];
  }

  private normalizeSkillNames(skills: string[]): string[] {
    const uniqueSkills = new Map<string, string>();
    skills.forEach((skill) => {
      const name = skill.trim();
      if (name) uniqueSkills.set(name.toLocaleLowerCase(), name);
    });
    return [...uniqueSkills.values()];
  }

  private normalizeAdditionalSections(
    items: AdditionalSectionItemDto[],
  ): Array<Record<string, string>> {
    return items.map((item) => ({
      id: item.id?.trim() || randomUUID(),
      type: item.type,
      sectionTitle: item.sectionTitle?.trim() || '',
      title: item.title.trim(),
      subtitle: item.subtitle?.trim() || '',
      description: item.description?.trim() || '',
      startDate: item.startDate?.trim() || '',
      endDate: item.endDate?.trim() || '',
      url: item.url?.trim() || '',
      level: item.level?.trim() || '',
      location: item.location?.trim() || '',
    }));
  }

  private createLibraryKey(values: string[]): string {
    return values
      .map((value) => value.trim().toLocaleLowerCase())
      .join('\u0000');
  }

  private toDateOnly(value: Date | string | null | undefined): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
  }

  private normalizeExperienceSkills(
    skills: ExperienceSkillDto[],
  ): Array<{ name: string; icon: string | null }> {
    const uniqueSkills = new Map<
      string,
      { name: string; icon: string | null }
    >();
    skills.forEach((skill) => {
      const name = skill.name.trim();
      const icon = skill.icon?.trim() || null;
      if (name) uniqueSkills.set(name.toLocaleLowerCase(), { name, icon });
    });
    return [...uniqueSkills.values()];
  }

  private async upsertUserSkills(
    userSkillRepo: Repository<UserSkillEntity>,
    user: UserEntity,
    generalSkills: string[],
    experienceSkills: ExperienceSkillDto[],
  ): Promise<void> {
    const skills = new Map<string, { name: string; icon: string | null }>();

    generalSkills.forEach((skill) => {
      const name = skill.trim();
      if (name) skills.set(name.toLocaleLowerCase(), { name, icon: null });
    });
    experienceSkills.forEach((skill) => {
      const name = skill.name?.trim();
      if (!name) return;
      const existing = skills.get(name.toLocaleLowerCase());
      skills.set(name.toLocaleLowerCase(), {
        name,
        icon: skill.icon?.trim() || existing?.icon || null,
      });
    });

    if (!skills.size) return;

    let existingSkills: UserSkillEntity[] = [];
    try {
      existingSkills = await userSkillRepo.find({
        where: { user: { id: user.id } },
      });
    } catch (error) {
      if (this.isMissingUserSkillsTable(error)) return;
      throw error;
    }
    const existingByName = new Map(
      existingSkills.map((skill) => [skill.name.toLocaleLowerCase(), skill]),
    );

    const entities = [...skills.values()].map((skill) => {
      const existing = existingByName.get(skill.name.toLocaleLowerCase());
      if (existing) {
        existing.name = skill.name;
        existing.icon = skill.icon || existing.icon;
        existing.hidden = false;
        return existing;
      }
      return userSkillRepo.create({
        user,
        name: skill.name,
        icon: skill.icon,
        hidden: false,
      });
    });

    try {
      await userSkillRepo.save(entities);
    } catch (error) {
      if (this.isMissingUserSkillsTable(error)) return;
      throw error;
    }
  }

  private isMissingUserSkillsTable(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '42P01'
    );
  }

  private getPhotoDirectory(): string {
    return join(
      process.cwd(),
      process.env.UPLOAD_DIR || 'uploads',
      'profile-photos',
    );
  }

  private normalizeCvPhotoUrl(photoUrl: string | undefined): string | null {
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

  private async removePhotoFile(photoUrl: string | null): Promise<void> {
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
}
