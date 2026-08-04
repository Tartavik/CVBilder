import { BadRequestException } from '@nestjs/common';

export const CV_PAGE_SIZE = 20;
export const CV_MAX_SELECTED_SKILLS = 20;

export type CvSortBy = 'title' | 'createdAt';
export type CvSortOrder = 'asc' | 'desc';

export interface CvListQuery {
  page: number;
  pageSize: number;
  sortBy: CvSortBy;
  sortOrder: CvSortOrder;
  author: string;
  query: string;
  createdFrom: string | null;
  createdTo: string | null;
  skills: string[];
}

export type CvListQueryParams = Record<string, string | string[] | undefined>;

const SORT_FIELDS = new Set<CvSortBy>(['title', 'createdAt']);
const SORT_ORDERS = new Set<CvSortOrder>(['asc', 'desc']);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseCvListQuery(params: CvListQueryParams): CvListQuery {
  const page = parsePositiveInteger(params['page'], 'page', 1);
  const pageSize = parsePositiveInteger(
    params['pageSize'],
    'pageSize',
    CV_PAGE_SIZE,
  );
  if (pageSize > CV_PAGE_SIZE) {
    throw new BadRequestException(
      `pageSize cannot be greater than ${CV_PAGE_SIZE}`,
    );
  }

  const sortBy = parseEnum(
    params['sortBy'],
    'sortBy',
    SORT_FIELDS,
    'createdAt',
  );
  const sortOrder = parseEnum(
    params['sortOrder'],
    'sortOrder',
    SORT_ORDERS,
    'desc',
  );
  const author = parseText(params['author'], 'author', 120);
  const query = parseText(params['query'], 'query', 300);
  if (query.split(/\s+/u).filter(Boolean).length > 10) {
    throw new BadRequestException('query cannot contain more than 10 words');
  }
  const createdFrom = parseDate(params['createdFrom'], 'createdFrom');
  const createdTo = parseDate(params['createdTo'], 'createdTo');
  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw new BadRequestException('createdFrom cannot be later than createdTo');
  }

  const skills = parseSkills(params['skills']);

  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    author,
    query,
    createdFrom,
    createdTo,
    skills,
  };
}

function parsePositiveInteger(
  value: string | string[] | undefined,
  field: string,
  fallback: number,
): number {
  const raw = singleValue(value, field);
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }
  return parsed;
}

function parseEnum<T extends string>(
  value: string | string[] | undefined,
  field: string,
  allowed: Set<T>,
  fallback: T,
): T {
  const raw = singleValue(value, field);
  if (raw === undefined || raw === '') return fallback;
  if (!allowed.has(raw as T)) {
    throw new BadRequestException(
      `${field} must be one of: ${[...allowed].join(', ')}`,
    );
  }
  return raw as T;
}

function parseText(
  value: string | string[] | undefined,
  field: string,
  maxLength: number,
): string {
  const raw = singleValue(value, field)?.trim() ?? '';
  if (raw.length > maxLength) {
    throw new BadRequestException(
      `${field} cannot be longer than ${maxLength} characters`,
    );
  }
  return raw;
}

function parseDate(
  value: string | string[] | undefined,
  field: string,
): string | null {
  const raw = singleValue(value, field)?.trim();
  if (!raw) return null;
  if (!ISO_DATE_PATTERN.test(raw)) {
    throw new BadRequestException(`${field} must use YYYY-MM-DD format`);
  }

  const [year, month, day] = raw.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${field} must be a valid date`);
  }
  return raw;
}

function parseSkills(value: string | string[] | undefined): string[] {
  const raw = singleValue(value, 'skills');
  if (!raw) return [];

  const skills = new Map<string, string>();
  raw.split(',').forEach((item) => {
    const skill = item.trim();
    if (!skill) return;
    if (skill.length > 50) {
      throw new BadRequestException(
        'Each skill cannot be longer than 50 characters',
      );
    }
    skills.set(skill.toLocaleLowerCase(), skill);
  });
  if (skills.size > CV_MAX_SELECTED_SKILLS) {
    throw new BadRequestException(
      `No more than ${CV_MAX_SELECTED_SKILLS} skills can be selected`,
    );
  }
  return [...skills.values()];
}

function singleValue(
  value: string | string[] | undefined,
  field: string,
): string | undefined {
  if (Array.isArray(value)) {
    throw new BadRequestException(`${field} must be provided only once`);
  }
  return value;
}
