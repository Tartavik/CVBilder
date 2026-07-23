export const ADDITIONAL_SECTION_TYPES = [
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
] as const;

export type AdditionalSectionType = (typeof ADDITIONAL_SECTION_TYPES)[number];

export interface AdditionalSectionItem {
  id: string;
  type: AdditionalSectionType;
  sectionTitle: string;
  title: string;
  subtitle: string;
  description: string;
  startDate: string;
  endDate: string;
  url: string;
  level: string;
  location: string;
}

export interface AdditionalSectionOption {
  type: AdditionalSectionType;
  label: string;
  itemLabel: string;
}

export const ADDITIONAL_SECTION_OPTIONS: AdditionalSectionOption[] = [
  { type: 'language', label: 'Languages', itemLabel: 'Language' },
  { type: 'project', label: 'Projects', itemLabel: 'Project' },
  {
    type: 'certification',
    label: 'Courses & certifications',
    itemLabel: 'Course or certification',
  },
  { type: 'link', label: 'Portfolio & links', itemLabel: 'Link label' },
  { type: 'award', label: 'Awards', itemLabel: 'Award' },
  {
    type: 'volunteering',
    label: 'Volunteering',
    itemLabel: 'Organization',
  },
  { type: 'publication', label: 'Publications', itemLabel: 'Publication' },
  {
    type: 'license',
    label: 'Professional licenses',
    itemLabel: 'License',
  },
  {
    type: 'membership',
    label: 'Memberships',
    itemLabel: 'Organization',
  },
  { type: 'reference', label: 'References', itemLabel: 'Person' },
  {
    type: 'careerBreak',
    label: 'Career breaks',
    itemLabel: 'Career break',
  },
  { type: 'custom', label: 'Custom section', itemLabel: 'Title' },
];

export function createAdditionalSectionItem(
  type: AdditionalSectionType,
  id: string,
): AdditionalSectionItem {
  return {
    id,
    type,
    sectionTitle: '',
    title: '',
    subtitle: '',
    description: '',
    startDate: '',
    endDate: '',
    url: '',
    level: '',
    location: '',
  };
}

export function getAdditionalSectionLabel(type: AdditionalSectionType): string {
  return (
    ADDITIONAL_SECTION_OPTIONS.find((option) => option.type === type)?.label ??
    'Additional'
  );
}

export function getAdditionalItemLabel(type: AdditionalSectionType): string {
  return (
    ADDITIONAL_SECTION_OPTIONS.find((option) => option.type === type)
      ?.itemLabel ?? 'Title'
  );
}

export function isAdditionalSectionType(
  value: string,
): value is AdditionalSectionType {
  return (ADDITIONAL_SECTION_TYPES as readonly string[]).includes(value);
}
