import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ADDITIONAL_SECTION_TYPES,
  CV_FIELD_LIMITS,
  CV_MIN_TEXT_LENGTH,
  VALID_SECTION_IDS,
} from '../constants/cv.constants';
import {
  AdditionalSectionItemDto,
  EducationItemDto,
  ExperienceItemDto,
  PersonalDataDto,
  SaveCvDto,
} from '../dto/save-cv.dto';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;
const SHORT_TEXT_PATTERN = /^[\p{L}][\p{L} .,'+#&-]*$/u;

@Injectable()
export class CvValidationService {
  validateForPublication(dto: SaveCvDto): void {
    this.validateDraft(dto);
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

  validateDraft(dto: SaveCvDto): void {
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

  isReady(dto: SaveCvDto): boolean {
    try {
      this.validateForPublication(dto);
      return true;
    } catch (error) {
      if (error instanceof BadRequestException) return false;
      throw error;
    }
  }

  parseDate(value: string, field: string): Date {
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

  private parseYear(value: string, index: number): number {
    if (!/^\d{4}$/.test(value)) {
      throw new BadRequestException(
        `education[${index}].year must be a four-digit year`,
      );
    }
    return Number(value);
  }
}
