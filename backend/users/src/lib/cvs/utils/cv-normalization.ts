import { randomUUID } from 'crypto';
import {
  DEFAULT_SECTION_ORDER,
  VALID_SECTION_IDS,
} from '../constants/cv.constants';
import {
  AdditionalSectionItemDto,
  ExperienceSkillDto,
} from '../dto/save-cv.dto';

export function normalizeSectionOrder(sectionOrder?: string[]): string[] {
  if (!sectionOrder?.length) return [...DEFAULT_SECTION_ORDER];

  const uniqueOrder = sectionOrder.filter(
    (section, index) =>
      VALID_SECTION_IDS.has(section) && sectionOrder.indexOf(section) === index,
  );
  return [
    ...uniqueOrder,
    ...DEFAULT_SECTION_ORDER.filter(
      (section) => !uniqueOrder.includes(section),
    ),
  ];
}

export function normalizeSkillNames(skills: string[]): string[] {
  const uniqueSkills = new Map<string, string>();
  skills.forEach((skill) => {
    const name = skill.trim();
    if (name) uniqueSkills.set(name.toLocaleLowerCase(), name);
  });
  return [...uniqueSkills.values()];
}

export function normalizeAdditionalSections(
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

export function normalizeExperienceSkills(
  skills: ExperienceSkillDto[],
): Array<{ name: string; icon: string | null }> {
  const uniqueSkills = new Map<string, { name: string; icon: string | null }>();
  skills.forEach((skill) => {
    const name = skill.name.trim();
    const icon = skill.icon?.trim() || null;
    if (name) uniqueSkills.set(name.toLocaleLowerCase(), { name, icon });
  });
  return [...uniqueSkills.values()];
}

export function createLibraryKey(values: string[]): string {
  return values.map((value) => value.trim().toLocaleLowerCase()).join('\u0000');
}

export function toDateOnly(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
