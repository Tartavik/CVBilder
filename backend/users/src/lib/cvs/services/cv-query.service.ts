import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { CvEntity } from '../entities/cv.entity';
import { CvListQuery, CvSortBy } from '../dto/list-cvs-query.dto';
import { ExperienceSkillEntity } from '../entities/experience-skill.entity';
import { GeneralSkillEntity } from '../entities/general-skill.entity';

export interface CvSummary {
  id: string;
  title: string;
  ownerEmail: string;
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
}

export interface PaginatedCvs {
  items: CvSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CvFilterOptions {
  skills: string[];
}

const SORT_COLUMNS: Record<CvSortBy, string> = {
  title: 'LOWER(cv.title)',
  createdAt: 'cv.createdAt',
};

@Injectable()
export class CvQueryService {
  constructor(
    @InjectRepository(CvEntity)
    private readonly cvRepo: Repository<CvEntity>,
    @InjectRepository(GeneralSkillEntity)
    private readonly generalSkillRepo: Repository<GeneralSkillEntity>,
    @InjectRepository(ExperienceSkillEntity)
    private readonly experienceSkillRepo: Repository<ExperienceSkillEntity>,
  ) {}

  async findAll(filters: CvListQuery): Promise<PaginatedCvs> {
    const query = this.cvRepo
      .createQueryBuilder('cv')
      .leftJoinAndSelect('cv.user', 'user')
      .where('cv.isPublished = :isPublished', { isPublished: true });

    this.applyAuthorFilter(query, filters.author);
    this.applyKeywordFilter(query, filters.query);
    this.applyCreatedDateFilter(query, filters.createdFrom, filters.createdTo);
    this.applySkillsFilter(query, filters.skills);

    const totalItems = await query.getCount();
    const totalPages = totalItems
      ? Math.ceil(totalItems / filters.pageSize)
      : 0;
    const page = totalPages ? Math.min(filters.page, totalPages) : 1;
    const direction = filters.sortOrder.toUpperCase() as 'ASC' | 'DESC';

    query
      .orderBy(SORT_COLUMNS[filters.sortBy], direction)
      .addOrderBy('cv.id', 'ASC')
      .skip((page - 1) * filters.pageSize)
      .take(filters.pageSize);

    const cvs = await query.getMany();
    return {
      items: cvs.map((cv) => ({
        id: cv.id,
        title: cv.title,
        ownerEmail: cv.user.email,
        createdAt: cv.createdAt,
        updatedAt: cv.updatedAt,
        isPublished: cv.isPublished,
      })),
      pagination: {
        page,
        pageSize: filters.pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getFilterOptions(): Promise<CvFilterOptions> {
    const [generalSkills, experienceSkills] = await Promise.all([
      this.generalSkillRepo
        .createQueryBuilder('skill')
        .select('skill.name', 'name')
        .innerJoin('skill.cv', 'cv', 'cv.isPublished = :isPublished', {
          isPublished: true,
        })
        .distinct(true)
        .getRawMany<{ name: string }>(),
      this.experienceSkillRepo
        .createQueryBuilder('skill')
        .select('skill.name', 'name')
        .innerJoin('skill.experience', 'experience')
        .innerJoin('experience.cv', 'cv', 'cv.isPublished = :isPublished', {
          isPublished: true,
        })
        .distinct(true)
        .getRawMany<{ name: string }>(),
    ]);

    const uniqueSkills = new Map<string, string>();
    [...generalSkills, ...experienceSkills].forEach(({ name }) => {
      const normalizedName = name.trim();
      if (normalizedName) {
        uniqueSkills.set(normalizedName.toLocaleLowerCase(), normalizedName);
      }
    });

    return {
      skills: [...uniqueSkills.values()].sort((left, right) =>
        left.localeCompare(right),
      ),
    };
  }

  private applyAuthorFilter(
    query: SelectQueryBuilder<CvEntity>,
    author: string,
  ): void {
    if (!author) return;
    const pattern = toContainsPattern(author);
    query.andWhere(
      new Brackets((authorQuery) => {
        authorQuery
          .where(`user.email ILIKE :author ESCAPE '!'`, { author: pattern })
          .orWhere(
            `EXISTS (
              SELECT 1
              FROM personal_details personal
              WHERE personal.cv_id = cv.id
                AND CONCAT_WS(' ', personal.full_name, personal.email)
                  ILIKE :author ESCAPE '!'
            )`,
            { author: pattern },
          );
      }),
    );
  }

  private applyKeywordFilter(
    query: SelectQueryBuilder<CvEntity>,
    searchQuery: string,
  ): void {
    const keywords = searchQuery
      .split(/\s+/u)
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    keywords.forEach((keyword, index) => {
      const parameter = `keyword${index}`;
      const value = toContainsPattern(keyword);
      query.andWhere(
        new Brackets((keywordQuery) => {
          keywordQuery
            .where(`cv.title ILIKE :${parameter} ESCAPE '!'`)
            .orWhere(`user.email ILIKE :${parameter} ESCAPE '!'`)
            .orWhere(
              `EXISTS (
                SELECT 1
                FROM personal_details personal
                WHERE personal.cv_id = cv.id
                  AND CONCAT_WS(
                    ' ',
                    personal.full_name,
                    personal.email,
                    personal.job_title,
                    personal.summary,
                    personal.address
                  ) ILIKE :${parameter} ESCAPE '!'
              )`,
            )
            .orWhere(
              `EXISTS (
                SELECT 1
                FROM experiences experience
                WHERE experience.cv_id = cv.id
                  AND CONCAT_WS(
                    ' ',
                    experience.company_name,
                    experience.position,
                    experience.description
                  ) ILIKE :${parameter} ESCAPE '!'
              )`,
            )
            .orWhere(
              `EXISTS (
                SELECT 1
                FROM education education_item
                WHERE education_item.cv_id = cv.id
                  AND CONCAT_WS(
                    ' ',
                    education_item.name,
                    education_item.degree,
                    education_item.description
                  ) ILIKE :${parameter} ESCAPE '!'
              )`,
            )
            .orWhere(
              `EXISTS (
                SELECT 1
                FROM general_skills general_skill
                WHERE general_skill.cv_id = cv.id
                  AND general_skill.name ILIKE :${parameter} ESCAPE '!'
              )`,
            )
            .orWhere(
              `EXISTS (
                SELECT 1
                FROM experiences experience
                INNER JOIN experience_skills experience_skill
                  ON experience_skill.experience_id = experience.id
                WHERE experience.cv_id = cv.id
                  AND experience_skill.name ILIKE :${parameter} ESCAPE '!'
              )`,
            )
            .orWhere(
              `"cv"."additional_sections"::text ILIKE :${parameter} ESCAPE '!'`,
            );
        }),
        { [parameter]: value },
      );
    });
  }

  private applyCreatedDateFilter(
    query: SelectQueryBuilder<CvEntity>,
    createdFrom: string | null,
    createdTo: string | null,
  ): void {
    if (createdFrom) {
      query.andWhere('cv.createdAt >= :createdFrom', {
        createdFrom: `${createdFrom}T00:00:00.000Z`,
      });
    }
    if (createdTo) {
      const exclusiveEnd = new Date(`${createdTo}T00:00:00.000Z`);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      query.andWhere('cv.createdAt < :createdTo', {
        createdTo: exclusiveEnd.toISOString(),
      });
    }
  }

  private applySkillsFilter(
    query: SelectQueryBuilder<CvEntity>,
    skills: string[],
  ): void {
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
  }
}

function toContainsPattern(value: string): string {
  return `%${value.replace(/[!%_]/g, (character) => `!${character}`)}%`;
}
