import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  UsersApiService,
  CvData as ApiCvData,
} from '../users-api.service';
import { ErrorService } from '../shared/errors/error.service';
import {
  PHONE_PATTERN,
  SHORT_TEXT_PATTERN,
  STRICT_EMAIL_PATTERN,
} from '../shared/validation-patterns';

export interface PersonalData {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  city: string;
  summary: string;
  photo: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  skills: ExperienceSkill[];
}

export interface ExperienceSkill {
  name: string;
  icon: string | null;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
}

export type CvSectionId = 'personal' | 'experience' | 'education' | 'skills' | 'details';

export interface CvSection {
  id: CvSectionId;
  label: string;
  isDraggable?: boolean;
}

export type CvTemplate = 'single' | 'classic';
export type ExperienceSkillMode = 'text' | 'icons';
export type CvValidationSection = CvSection['id'];

export interface CvData {
  personal: PersonalData;
  experience: ExperienceItem[];
  education: EducationItem[];
  generalSkills: string[];
  experienceSkillMode: ExperienceSkillMode;
  sectionOrder: CvSection['id'][];
  template: CvTemplate;
}

export interface CvMetadata {
  id: string;
  title: string;
  ownerEmail: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_PATTERN = /^\d{4}$/;

const DEFAULT_DATA: CvData = {
  personal: {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    city: '',
    summary: '',
    photo: '',
  },
  experience: [],
  education: [],
  generalSkills: [],
  experienceSkillMode: 'text',
  sectionOrder: ['personal', 'experience', 'education', 'skills', 'details'],
  template: 'single',
};

@Injectable({ providedIn: 'root' })
export class CvStore {
  private readonly api = inject(UsersApiService);
  private readonly errors = inject(ErrorService);
  readonly cv = signal<CvData>(DEFAULT_DATA);
  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);
  readonly validationAttempt = signal(0);
  readonly invalidSections = signal<Set<CvValidationSection>>(new Set());
  readonly metadata = signal<CvMetadata | null>(null);
  readonly userSkills = signal<ExperienceSkill[]>([]);
  readonly photoUploading = signal(false);
  private activeUserId = '';
  private activeCvId = '';

  readonly sections: CvSection[] = [
    { id: 'personal', label: 'Personal Info', isDraggable: true },
    { id: 'experience', label: 'Experience', isDraggable: true },
    { id: 'education', label: 'Education', isDraggable: true },
    { id: 'skills', label: 'General Skills', isDraggable: true },
    { id: 'details', label: 'Details', isDraggable: false },
  ];

  private updateState(data: CvData) {
    this.cv.set(data);
    if (this.validationAttempt() > 0) {
      this.invalidSections.set(this.getInvalidSections(data));
    }
  }

  loadFromDB(userId: string, cvId: string) {
    this.activeUserId = userId;
    this.activeCvId = cvId;
    this.loading.set(true);
    this.ready.set(false);
    this.error.set(null);
    this.api.getCv(userId, cvId).subscribe({
      next: (data) => {
        this.updateState(this.mapApiDataToStore(data));
        this.updateMetadata(data);
        this.loadUserSkills(userId);
        this.loading.set(false);
        this.ready.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.getErrorMessage(err, 'Failed to load CV'));
        this.loading.set(false);
        this.updateState(DEFAULT_DATA);
        this.metadata.set(null);
        this.ready.set(true);
      },
    });
  }

  loadPublic(cvId: string) {
    this.activeUserId = '';
    this.activeCvId = '';
    this.loading.set(true);
    this.ready.set(false);
    this.error.set(null);
    this.api.getPublicCv(cvId).subscribe({
      next: (data) => {
        this.updateState(this.mapApiDataToStore(data));
        this.updateMetadata(data);
        this.loading.set(false);
        this.ready.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.getErrorMessage(err, 'Failed to load CV'));
        this.loading.set(false);
        this.updateState(DEFAULT_DATA);
        this.metadata.set(null);
        this.ready.set(true);
      },
    });
  }

  saveToDB(
    userId: string,
    cvId: string,
    callback?: () => void,
    errorCallback?: () => void,
  ): boolean {
    const validationError = this.getValidationError(this.cv());
    if (validationError) {
      this.validationAttempt.update((attempt) => attempt + 1);
      this.invalidSections.set(this.getInvalidSections(this.cv()));
      this.error.set(validationError);
      return false;
    }

    this.loading.set(true);
    this.error.set(null);
    this.invalidSections.set(new Set());
    const cvData = this.mapStoreDataToApi(this.cv());
    this.api.saveCv(userId, cvId, cvData).subscribe({
      next: () => {
        const currentMetadata = this.metadata();
        if (currentMetadata) {
          this.metadata.set({
            ...currentMetadata,
            title:
              this.cv().personal.fullName.trim() ||
              this.cv().personal.jobTitle.trim() ||
              currentMetadata.title,
          });
        }
        this.loading.set(false);
        callback?.();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.getErrorMessage(err, 'Failed to save CV'));
        this.loading.set(false);
        errorCallback?.();
      },
    });
    return true;
  }

  private mapApiDataToStore(apiData: ApiCvData): CvData {
    return {
      personal: {
        ...DEFAULT_DATA.personal,
        ...(apiData.personal || {}),
        photo: apiData.personal?.photo || '',
      },
      experience: (apiData.experience || []).map(exp => ({
        id: exp.id || crypto.randomUUID(),
        company: exp.company || '',
        position: exp.position || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        current: exp.current ?? false,
        description: exp.description || '',
        skills: (exp.skills || []).map((skill) =>
          typeof skill === 'string'
            ? { name: skill, icon: null }
            : { name: skill.name, icon: skill.icon || null },
        ),
      })),
      education: (apiData.education || []).map(edu => ({
        ...edu,
        id: edu.id || crypto.randomUUID(),
      })),
      generalSkills: apiData.generalSkills || [],
      experienceSkillMode: apiData.experienceSkillMode || 'text',
      sectionOrder: apiData.sectionOrder?.length
        ? apiData.sectionOrder as CvSection['id'][]
        : DEFAULT_DATA.sectionOrder,
      template: apiData.template || 'single',
    };
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    return this.errors.getMessage(error, fallback);
  }

  private updateMetadata(apiData: ApiCvData): void {
    this.metadata.set({
      id: apiData.id || '',
      title: apiData.title || 'Untitled CV',
      ownerEmail: apiData.ownerEmail || '',
    });
  }

  private mapStoreDataToApi(storeData: CvData): ApiCvData {
    return {
      personal: {
        fullName: storeData.personal.fullName,
        jobTitle: storeData.personal.jobTitle,
        email: storeData.personal.email,
        phone: storeData.personal.phone,
        city: storeData.personal.city,
        summary: storeData.personal.summary,
        photo: storeData.personal.photo,
      },
      experience: storeData.experience.map(exp => ({
        id: exp.id,
        company: exp.company,
        position: exp.position,
        startDate: exp.startDate,
        endDate: exp.endDate || undefined,
        current: exp.current,
        description: exp.description || undefined,
        skills: exp.skills,
      })),
      education: storeData.education,
      generalSkills: storeData.generalSkills,
      experienceSkillMode: storeData.experienceSkillMode,
      sectionOrder: storeData.sectionOrder,
      template: storeData.template,
    };
  }

  updatePersonal(personal: PersonalData) {
    this.updateState({ ...this.cv(), personal });
  }

  addExperience() {
    const item: ExperienceItem = {
      id: crypto.randomUUID(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      skills: [],
    };
    this.updateState({ ...this.cv(), experience: [...this.cv().experience, item] });
  }

  updateExperience(id: string, patch: Partial<ExperienceItem>) {
    const experience = this.cv().experience.map((e) =>
      e.id === id ? { ...e, ...patch } : e
    );
    this.updateState({ ...this.cv(), experience });
  }

  removeExperience(id: string) {
    this.updateState({ ...this.cv(), experience: this.cv().experience.filter((e) => e.id !== id) });
  }

  addEducation() {
    const item: EducationItem = {
      id: crypto.randomUUID(),
      institution: '',
      degree: '',
      field: '',
      year: '',
    };
    this.updateState({ ...this.cv(), education: [...this.cv().education, item] });
  }

  updateEducation(id: string, patch: Partial<EducationItem>) {
    const education = this.cv().education.map((e) =>
      e.id === id ? { ...e, ...patch } : e
    );
    this.updateState({ ...this.cv(), education });
  }

  removeEducation(id: string) {
    this.updateState({ ...this.cv(), education: this.cv().education.filter((e) => e.id !== id) });
  }

  updateGeneralSkills(generalSkills: string[]) {
    this.updateState({ ...this.cv(), generalSkills });
  }

  updateExperienceSkillMode(experienceSkillMode: ExperienceSkillMode) {
    this.updateState({ ...this.cv(), experienceSkillMode });
  }

  rememberUserSkill(skill: ExperienceSkill): void {
    const name = skill.name.trim();
    if (!name) return;
    const skills = new Map(
      this.userSkills().map((item) => [item.name.toLocaleLowerCase(), item]),
    );
    const existing = skills.get(name.toLocaleLowerCase());
    skills.set(name.toLocaleLowerCase(), {
      name,
      icon: skill.icon || existing?.icon || null,
    });
    this.userSkills.set([...skills.values()].sort((a, b) => a.name.localeCompare(b.name)));
  }

  uploadProfilePhoto(file: File): void {
    if (!this.activeUserId || !this.activeCvId) return;

    this.photoUploading.set(true);
    this.error.set(null);
    this.api
      .uploadCvPhoto(this.activeUserId, this.activeCvId, file)
      .subscribe({
        next: ({ photoUrl }) => {
          this.updatePersonal({ ...this.cv().personal, photo: photoUrl });
          this.photoUploading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.getErrorMessage(err, 'Failed to upload photo'));
          this.photoUploading.set(false);
        },
      });
  }

  deleteProfilePhoto(): void {
    this.updatePersonal({ ...this.cv().personal, photo: '' });
  }

  updateSectionOrder(sectionOrder: CvSection['id'][]) {
    this.updateState({ ...this.cv(), sectionOrder });
  }

  updateTemplate(template: CvTemplate) {
    this.updateState({ ...this.cv(), template });
  }

  private loadUserSkills(userId: string): void {
    this.api.getUserSkills(userId).subscribe({
      next: (skills) =>
        this.userSkills.set(
          skills.map((skill) => ({ name: skill.name, icon: skill.icon ?? null })),
        ),
      error: () => this.userSkills.set([]),
    });
  }

  private getInvalidSections(data: CvData): Set<CvValidationSection> {
    const invalidSections = new Set<CvValidationSection>();
    const personal = data.personal;

    if (
      !this.isValidShortText(personal.fullName) ||
      !this.isValidShortText(personal.jobTitle)
    ) {
      invalidSections.add('personal');
    }

    if (!personal.summary.trim() || personal.summary.trim().length < 2) {
      invalidSections.add(data.template === 'classic' ? 'details' : 'personal');
    }

    if (
      !STRICT_EMAIL_PATTERN.test(personal.email.trim()) ||
      !PHONE_PATTERN.test(personal.phone.trim()) ||
      !this.isValidShortText(personal.city)
    ) {
      invalidSections.add(data.template === 'classic' ? 'details' : 'personal');
    }

    if (data.experience.some((item) => !this.isValidExperience(item))) {
      invalidSections.add('experience');
    }

    if (data.education.some((item) => !this.isValidEducation(item))) {
      invalidSections.add('education');
    }

    return invalidSections;
  }

  private getValidationError(data: CvData): string | null {
    const personal = data.personal;
    const personalFields: Array<[keyof PersonalData, string]> = [
      ['fullName', 'Full name'],
      ['jobTitle', 'Job title'],
      ['email', 'Email'],
      ['phone', 'Phone'],
      ['city', 'City'],
      ['summary', 'Summary'],
    ];
    for (const [field, label] of personalFields) {
      const value = personal[field]?.trim();
      if (!value) return `${label} is required`;
      if (value.length < 2) return `${label} must be at least 2 characters`;
    }
    if (!STRICT_EMAIL_PATTERN.test(personal.email.trim())) {
      return 'Enter a valid email';
    }
    if (!PHONE_PATTERN.test(personal.phone.trim())) {
      return 'Phone must start with + and contain 10-15 digits';
    }
    for (const [field, label] of [
      ['fullName', 'Full name'],
      ['jobTitle', 'Job title'],
      ['city', 'City'],
    ] as Array<[keyof PersonalData, string]>) {
      if (!SHORT_TEXT_PATTERN.test(personal[field].trim())) {
        return `${label} contains unsupported characters`;
      }
    }

    for (let i = 0; i < data.experience.length; i += 1) {
      const item = data.experience[i];
      if (!this.isValidShortText(item.company) || !this.isValidShortText(item.position)) {
        return `Experience ${i + 1} requires company and position`;
      }
      if (!item.startDate.trim()) {
        return `Experience ${i + 1} requires start date`;
      }
      if (!DATE_PATTERN.test(item.startDate)) {
        return `Experience ${i + 1} start date must use YYYY-MM-DD format`;
      }
      const startDate = this.parseDate(item.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate && startDate > today) {
        return `Experience ${i + 1} start date cannot be in the future`;
      }
      if (!item.current) {
        if (!item.endDate.trim()) {
          return `Experience ${i + 1} requires end date`;
        }
        if (!DATE_PATTERN.test(item.endDate)) {
          return `Experience ${i + 1} end date must use YYYY-MM-DD format`;
        }
        const endDate = this.parseDate(item.endDate);
        if (startDate && endDate && endDate < startDate) {
          return `Experience ${i + 1} end date cannot be before start date`;
        }
      }
      if (!item.description.trim() || item.description.trim().length < 2) {
        return `Experience ${i + 1} description must be at least 2 characters`;
      }
    }

    for (let i = 0; i < data.education.length; i += 1) {
      const item = data.education[i];
      if (
        !this.isValidShortText(item.institution) ||
        !item.year.trim() ||
        !this.isValidShortText(item.degree) ||
        !this.isValidShortText(item.field)
      ) {
        return `Education ${i + 1} requires all fields`;
      }
      if (!YEAR_PATTERN.test(item.year)) {
        return `Education ${i + 1} year must be a four-digit year`;
      }
    }

    return null;
  }

  private isValidShortText(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.length >= 2 && SHORT_TEXT_PATTERN.test(trimmed);
  }

  private isValidExperience(item: ExperienceItem): boolean {
    if (!this.isValidShortText(item.company) || !this.isValidShortText(item.position)) {
      return false;
    }
    if (!DATE_PATTERN.test(item.startDate)) return false;
    const startDate = this.parseDate(item.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!startDate || startDate > today) return false;
    if (!item.current) {
      if (!DATE_PATTERN.test(item.endDate)) return false;
      const endDate = this.parseDate(item.endDate);
      if (!endDate || endDate < startDate) return false;
    }
    return item.description.trim().length >= 2;
  }

  private isValidEducation(item: EducationItem): boolean {
    return (
      this.isValidShortText(item.institution) &&
      this.isValidShortText(item.degree) &&
      this.isValidShortText(item.field) &&
      YEAR_PATTERN.test(item.year)
    );
  }

  private parseDate(value: string): Date | null {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
