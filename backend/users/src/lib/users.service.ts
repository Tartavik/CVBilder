import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';
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
import {
  EducationItemDto,
  ExperienceItemDto,
  ExperienceSkillDto,
  PersonalDataDto,
  SaveCvDto,
} from './dto/save-cv.dto';

const DEFAULT_SECTION_ORDER = [
  'personal',
  'experience',
  'education',
  'skills',
  'details',
];
const VALID_SECTION_IDS = new Set(DEFAULT_SECTION_ORDER);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+[1-9]\d{9,14}$/;
const SHORT_TEXT_PATTERN = /^[\p{L}][\p{L} .,'+#&-]*$/u;
const PHOTO_MIME_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

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
    this.validateCredentials(email, passwordHash);
    const user = this.userRepo.create({
      email: this.normalizeEmail(email),
      passwordHash,
    });
    return this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    if (typeof email !== 'string') return null;
    return this.userRepo.findOne({ where: { email: this.normalizeEmail(email) } });
  }

  async login(email: string, password: string): Promise<UserEntity | null> {
    this.validateCredentials(email, password);
    const user = await this.findByEmail(email);
    if (!user || user.passwordHash !== password) return null;
    return user;
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

  async createCv(userId: string) {
    const user = await this.findById(userId);
    const cv = await this.cvRepo.save(
      this.cvRepo.create({
        user,
        title: 'Untitled CV',
        template: 'single',
        experienceSkillMode: 'text',
        sectionOrder: [...DEFAULT_SECTION_ORDER],
      }),
    );
    return this.toCvSummary(cv, user);
  }

  async getUserSkills(userId: string): Promise<Array<{ name: string; icon: string | null }>> {
    const user = await this.findById(userId);
    try {
      const skills = await this.userSkillRepo.find({
        where: { user: { id: user.id } },
        order: { name: 'ASC' },
      });
      return skills.map((skill) => ({ name: skill.name, icon: skill.icon }));
    } catch (error) {
      if (this.isMissingUserSkillsTable(error)) return [];
      throw error;
    }
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

  async getAllCvs(skillsQuery?: string) {
    const skills = this.normalizeSkillNames(skillsQuery?.split(',') ?? []);
    const query = this.cvRepo
      .createQueryBuilder('cv')
      .leftJoinAndSelect('cv.user', 'user')
      .orderBy('cv.updatedAt', 'DESC');

    skills.forEach((skill, index) => {
      const parameter = `skill${index}`;
      query.andWhere(
        `(EXISTS (
          SELECT 1
          FROM general_skills general_skill
          WHERE general_skill.cv_id = cv.id
            AND LOWER(general_skill.name) = LOWER(:${parameter})
        ) OR EXISTS (
          SELECT 1
          FROM experiences experience
          INNER JOIN experience_skills experience_skill
            ON experience_skill.experience_id = experience.id
          WHERE experience.cv_id = cv.id
            AND LOWER(experience_skill.name) = LOWER(:${parameter})
        ))`,
        { [parameter]: skill },
      );
    });

    const cvs = await query.getMany();
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
      where: { id: cvId },
      relations: ['user'],
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);
    return this.getCvData(cv);
  }

  async saveCv(userId: string, cvId: string, dto: SaveCvDto) {
    this.validateCv(dto);
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
      if (!cv) throw new NotFoundException(`CV ${cvId} not found`);

      cv.title = this.getCvTitle(dto, cv.title);
      cv.template = template;
      cv.experienceSkillMode = dto.experienceSkillMode ?? 'text';
      cv.sectionOrder = sectionOrder;
      cv = await cvRepo.save(cv);

      const personal = dto.personal;
      let personalDetail = await personalDetailRepo.findOne({
        where: { cv: { id: cv.id } },
      });
      const hasPhotoDraft = Object.prototype.hasOwnProperty.call(personal, 'photo');
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
          startDate: this.parseDate(
            exp.startDate,
            `experience[${index}].startDate`,
          ),
          endDate: exp.current
            ? null
            : exp.endDate
              ? this.parseDate(exp.endDate, `experience[${index}].endDate`)
              : null,
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
      const education = dto.education.map((edu, index) =>
        educationRepo.create({
          cv,
          name: edu.institution,
          degree: edu.degree,
          graduationYear: this.parseYear(edu.year, index),
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

      return { success: true, cvId: cv.id };
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
        current: !experience.endDate,
        skills: skillsByExperience.get(experience.id) ?? [],
      })),
      education: education.map((item) => ({
        id: item.id,
        institution: item.name,
        degree: item.degree,
        field: item.description || '',
        year: item.graduationYear?.toString() || '',
      })),
      generalSkills: generalSkills.map((skill) => skill.name),
      experienceSkillMode: cv.experienceSkillMode,
      sectionOrder: cv.sectionOrder,
      template: cv.template,
    };
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

  private validateCv(dto: SaveCvDto): void {
    if (
      !dto?.personal ||
      !Array.isArray(dto.experience) ||
      !Array.isArray(dto.education) ||
      (dto.generalSkills !== undefined &&
        !Array.isArray(dto.generalSkills)) ||
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

    this.validatePersonal(dto.personal);
    dto.experience.forEach((experience, index) =>
      this.validateExperience(experience, index),
    );
    dto.education.forEach((education, index) =>
      this.validateEducation(education, index),
    );
  }

  private validatePersonal(personal: PersonalDataDto): void {
    const requiredFields: Array<[keyof PersonalDataDto, string, boolean?]> = [
      ['fullName', 'Full name'],
      ['jobTitle', 'Job title'],
      ['email', 'Email', false],
      ['phone', 'Phone', false],
      ['city', 'City'],
      ['summary', 'Summary', false],
    ];

    for (const [field, label, validateText = true] of requiredFields) {
      this.validateRequiredString(personal[field], label, { validateText });
    }

    if (!EMAIL_PATTERN.test(personal.email.trim())) {
      throw new BadRequestException('Enter a valid email');
    }
    if (!PHONE_PATTERN.test(personal.phone.trim())) {
      throw new BadRequestException(
        'Phone must start with + and contain 10-15 digits',
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
      experience.description.trim().length < 2
    ) {
      throw new BadRequestException(
        `Experience ${index + 1} description must be at least 2 characters`,
      );
    }
    if (
      experience.skills !== undefined &&
      (!Array.isArray(experience.skills) ||
        experience.skills.some(
          (skill) =>
            !skill ||
            typeof skill.name !== 'string' ||
            (skill.icon !== undefined && typeof skill.icon !== 'string'),
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

  private validateRequiredString(
    value: string,
    label: string,
    options: { validateText?: boolean } = {},
  ): void {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${label} is required`);
    }
    if (value.trim().length < 2) {
      throw new BadRequestException(`${label} must be at least 2 characters`);
    }
    if (options.validateText !== false && !SHORT_TEXT_PATTERN.test(value.trim())) {
      throw new BadRequestException(`${label} contains unsupported characters`);
    }
  }

  private isValidShortText(value: string): boolean {
    return (
      typeof value === 'string' &&
      value.trim().length >= 2 &&
      SHORT_TEXT_PATTERN.test(value.trim())
    );
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
      ...DEFAULT_SECTION_ORDER.filter((section) => !uniqueOrder.includes(section)),
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
        return existing;
      }
      return userSkillRepo.create({ user, name: skill.name, icon: skill.icon });
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
