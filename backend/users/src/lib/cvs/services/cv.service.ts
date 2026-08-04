import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserSkillEntity } from '../../skills/entities/user-skill.entity';
import { UserSkillsService } from '../../skills/services/user-skills.service';
import { UserEntity } from '../../users/entities/user.entity';
import { UsersService } from '../../users/services/users.service';
import { DEFAULT_SECTION_ORDER } from '../constants/cv.constants';
import { SaveCvDto } from '../dto/save-cv.dto';
import { CvEntity } from '../entities/cv.entity';
import { EducationEntity } from '../entities/education.entity';
import { ExperienceSkillEntity } from '../entities/experience-skill.entity';
import { ExperienceEntity } from '../entities/experience.entity';
import { GeneralSkillEntity } from '../entities/general-skill.entity';
import { PersonalDetailEntity } from '../entities/personal-detail.entity';
import {
  createLibraryKey,
  normalizeAdditionalSections,
  normalizeExperienceSkills,
  normalizeSectionOrder,
  normalizeSkillNames,
  toDateOnly,
} from '../utils/cv-normalization';
import { CvPhotoService } from './cv-photo.service';
import { CvValidationService } from './cv-validation.service';

@Injectable()
export class CvService {
  constructor(
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
    @InjectRepository(PersonalDetailEntity)
    private readonly personalDetailRepo: Repository<PersonalDetailEntity>,
    private readonly usersService: UsersService,
    private readonly userSkillsService: UserSkillsService,
    private readonly cvValidation: CvValidationService,
    private readonly cvPhotoService: CvPhotoService,
  ) {}

  async getLibrary(userId: string, cvId?: string) {
    if (cvId) {
      const cv = await this.cvRepo.findOne({
        where: { id: cvId, user: { id: userId } },
      });
      if (!cv) throw new NotFoundException(`CV ${cvId} not found`);
    } else {
      await this.usersService.findById(userId);
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
      const startDate = toDateOnly(experience.startDate);
      const endDate = toDateOnly(experience.endDate);
      const key = createLibraryKey([
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
      const key = createLibraryKey([
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

  async findUserCvs(userId: string) {
    await this.usersService.findById(userId);
    const cvs = await this.cvRepo.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { updatedAt: 'DESC' },
    });
    return cvs.map((cv) => this.toSummary(cv, cv.user));
  }

  async findUserCv(userId: string, cvId: string) {
    const cv = await this.cvRepo.findOne({
      where: { id: cvId, user: { id: userId } },
      relations: ['user'],
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);
    return this.getData(cv);
  }

  async findPublicCv(cvId: string) {
    const cv = await this.cvRepo.findOne({
      where: { id: cvId, isPublished: true },
      relations: ['user'],
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);
    return this.getData(cv);
  }

  async save(userId: string, cvId: string, dto: SaveCvDto) {
    return this.persist(userId, cvId, dto, false);
  }

  async createFromDraft(userId: string, cvId: string, dto: SaveCvDto) {
    return this.persist(userId, cvId, dto, true);
  }

  async setPublication(
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
      const cvData = await this.getData(cv);
      this.cvValidation.validateForPublication({
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

  async delete(userId: string, cvId: string): Promise<{ success: true }> {
    const cv = await this.cvRepo.findOne({
      where: { id: cvId, user: { id: userId } },
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);

    const personalDetail = await this.personalDetailRepo.findOne({
      where: { cv: { id: cvId } },
    });
    const photoUrl = personalDetail?.photoUrl ?? null;
    await this.cvRepo.remove(cv);
    await this.cvPhotoService.removePhotoFile(photoUrl);
    return { success: true };
  }

  async generateSkillIcon(userId: string, cvId: string, skillName?: string) {
    const cv = await this.cvRepo.findOne({
      where: { id: cvId, user: { id: userId } },
    });
    if (!cv) throw new NotFoundException(`CV ${cvId} not found`);
    return this.userSkillsService.generateIcon(userId, skillName);
  }

  private async persist(
    userId: string,
    cvId: string,
    dto: SaveCvDto,
    createNew: boolean,
  ) {
    this.cvValidation.validateDraft(dto);
    const sectionOrder = normalizeSectionOrder(dto.sectionOrder);
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

      cv.title = this.getTitle(dto, cv.title);
      cv.template = template;
      cv.experienceSkillMode = dto.experienceSkillMode ?? 'text';
      cv.sectionOrder = sectionOrder;
      cv.additionalSections = normalizeAdditionalSections(
        dto.additionalSections ?? [],
      );
      if (cv.isPublished && !this.cvValidation.isReady(dto)) {
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
        ? this.cvPhotoService.normalizePhotoUrl(personal.photo)
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

      if (personalDetail) Object.assign(personalDetail, personalValues);
      else
        personalDetail = personalDetailRepo.create({ cv, ...personalValues });
      await personalDetailRepo.save(personalDetail);

      await experienceRepo.delete({ cv: { id: cv.id } });
      const experiences = dto.experience.map((experience, index) =>
        experienceRepo.create({
          cv,
          companyName: experience.company,
          position: experience.position,
          startDate: experience.startDate
            ? this.cvValidation.parseDate(
                experience.startDate,
                `experience[${index}].startDate`,
              )
            : null,
          endDate: experience.current
            ? null
            : experience.endDate
              ? this.cvValidation.parseDate(
                  experience.endDate,
                  `experience[${index}].endDate`,
                )
              : null,
          isCurrent: experience.current ?? false,
          description: experience.description,
        }),
      );
      const savedExperiences = experiences.length
        ? await experienceRepo.save(experiences)
        : [];
      const experienceSkills = savedExperiences.flatMap((experience, index) =>
        normalizeExperienceSkills(dto.experience[index].skills ?? []).map(
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
      const education = dto.education.map((item) =>
        educationRepo.create({
          cv,
          name: item.institution,
          degree: item.degree,
          graduationYear: item.year ? Number(item.year) : null,
          description: item.field,
        }),
      );
      if (education.length) await educationRepo.save(education);

      await generalSkillRepo.delete({ cv: { id: cv.id } });
      const generalSkills = normalizeSkillNames(dto.generalSkills ?? []).map(
        (name) => generalSkillRepo.create({ cv, name }),
      );
      if (generalSkills.length) await generalSkillRepo.save(generalSkills);

      await this.userSkillsService.upsert(
        userSkillRepo,
        user,
        dto.generalSkills ?? [],
        dto.experience.flatMap((experience) => experience.skills ?? []),
      );

      return { success: true, cvId: cv.id, isPublished: cv.isPublished };
    });

    await this.cvPhotoService.removePhotoFile(obsoletePhotoUrl);
    return result;
  }

  private async getData(cv: CvEntity) {
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

  private toSummary(cv: CvEntity, user: UserEntity) {
    return {
      id: cv.id,
      title: cv.title,
      ownerEmail: user.email,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt,
      isPublished: cv.isPublished,
    };
  }

  private getTitle(dto: SaveCvDto, currentTitle: string): string {
    return (
      dto.personal.fullName?.trim() ||
      dto.personal.jobTitle?.trim() ||
      currentTitle ||
      'Untitled CV'
    );
  }
}
