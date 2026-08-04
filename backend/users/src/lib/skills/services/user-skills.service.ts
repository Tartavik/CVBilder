import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiIconService } from '../../infrastructure/ai/ai-icon.service';
import { UserEntity } from '../../users/entities/user.entity';
import { UsersService } from '../../users/services/users.service';
import { UserSkillEntity } from '../entities/user-skill.entity';

const SKILL_NAME_MAX_LENGTH = 50;

export interface SkillInput {
  name: string;
  icon?: string | null;
}

@Injectable()
export class UserSkillsService {
  constructor(
    @InjectRepository(UserSkillEntity)
    private readonly userSkillRepo: Repository<UserSkillEntity>,
    private readonly usersService: UsersService,
    private readonly aiIconService: AiIconService,
  ) {}

  async findAll(
    userId: string,
  ): Promise<Array<{ name: string; icon: string | null; hidden: boolean }>> {
    const user = await this.usersService.findById(userId);
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

  async hide(userId: string, skillName?: string): Promise<{ success: true }> {
    const trimmedName = this.validateSkillName(skillName);
    const user = await this.usersService.findById(userId);
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

  async generateIcon(
    userId: string,
    skillName?: string,
  ): Promise<{ icon: string; source: 'generated' | 'found' }> {
    const trimmedName = this.validateSkillName(skillName);
    const user = await this.usersService.findById(userId);
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
    await this.upsert(
      this.userSkillRepo,
      user,
      [],
      [{ name: trimmedName, icon }],
    );
    return { icon, source };
  }

  async upsert(
    repository: Repository<UserSkillEntity>,
    user: UserEntity,
    generalSkills: string[],
    experienceSkills: SkillInput[],
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
      existingSkills = await repository.find({
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
      return repository.create({
        user,
        name: skill.name,
        icon: skill.icon,
        hidden: false,
      });
    });

    try {
      await repository.save(entities);
    } catch (error) {
      if (this.isMissingUserSkillsTable(error)) return;
      throw error;
    }
  }

  private validateSkillName(skillName?: string): string {
    const trimmedName = skillName?.trim();
    if (!trimmedName) {
      throw new BadRequestException('Skill name is required');
    }
    if (trimmedName.length > SKILL_NAME_MAX_LENGTH) {
      throw new BadRequestException(
        `Skill name must be ${SKILL_NAME_MAX_LENGTH} characters or fewer`,
      );
    }
    return trimmedName;
  }

  private isMissingUserSkillsTable(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '42P01'
    );
  }
}
