export const DEFAULT_SECTION_ORDER = [
  'personal',
  'experience',
  'education',
  'skills',
  'additional',
  'details',
];

export const VALID_SECTION_IDS = new Set(DEFAULT_SECTION_ORDER);

export const ADDITIONAL_SECTION_TYPES = new Set([
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

export const CV_MIN_TEXT_LENGTH = 2;

export const CV_FIELD_LIMITS = {
  shortText: 120,
  longText: 500,
  email: 120,
  phone: 16,
  skill: 50,
  url: 2048,
} as const;
