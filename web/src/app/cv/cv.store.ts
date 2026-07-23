import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, forkJoin, of, throwError } from 'rxjs';
import {
  UsersApiService,
  CvData as ApiCvData,
  CvSectionLibrary,
  SkillIconGenerationResult,
} from '../users-api.service';
import { ErrorService } from '../shared/errors/error.service';
import {
  PHONE_PATTERN,
  SHORT_TEXT_PATTERN,
  STRICT_EMAIL_PATTERN,
} from '../shared/validation-patterns';
import {
  AdditionalSectionItem,
  AdditionalSectionType,
  createAdditionalSectionItem,
  isAdditionalSectionType,
} from './additional-sections';
import {
  CV_FIELD_LIMITS,
  CV_MIN_TEXT_LENGTH,
} from './cv-field-limits';

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

export type CvSectionId =
  | 'personal'
  | 'experience'
  | 'education'
  | 'skills'
  | 'additional'
  | 'details';

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
  additionalSections: AdditionalSectionItem[];
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
  additionalSections: [],
  generalSkills: [],
  experienceSkillMode: 'text',
  sectionOrder: [
    'personal',
    'experience',
    'education',
    'skills',
    'additional',
    'details',
  ],
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
  readonly reusableExperiences = signal<ExperienceItem[]>([]);
  readonly reusableEducation = signal<EducationItem[]>([]);
  readonly photoUploading = signal(false);
  readonly isDraft = signal(false);
  private activeUserId = '';
  private activeCvId = '';
  private pendingPhotoFile: File | null = null;
  private pendingPhotoUrl = '';

  readonly sections: CvSection[] = [
    { id: 'personal', label: 'Personal Info', isDraggable: true },
    { id: 'experience', label: 'Experience', isDraggable: true },
    { id: 'education', label: 'Education', isDraggable: true },
    { id: 'skills', label: 'General Skills', isDraggable: true },
    { id: 'additional', label: 'Additional Sections', isDraggable: true },
    { id: 'details', label: 'Details', isDraggable: false },
  ];

  private updateState(data: CvData) {
    this.cv.set(data);
    if (this.validationAttempt() > 0) {
      this.invalidSections.set(this.getInvalidSections(data));
    }
  }

  loadFromDB(userId: string, cvId: string) {
    this.releasePendingPhoto();
    this.activeUserId = userId;
    this.activeCvId = cvId;
    this.isDraft.set(false);
    this.loading.set(true);
    this.ready.set(false);
    this.error.set(null);
    this.userSkills.set([]);
    this.reusableExperiences.set([]);
    this.reusableEducation.set([]);
    this.api.getCv(userId, cvId).subscribe({
      next: (data) => {
        this.updateState(this.mapApiDataToStore(data));
        this.updateMetadata(data);
        this.loadUserSkills(userId);
        this.loadCvSectionLibrary(userId, cvId);
        this.loading.set(false);
        this.ready.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.getErrorMessage(err, 'Failed to load CV'));
        this.loading.set(false);
        this.updateState(this.createDefaultData());
        this.metadata.set(null);
        this.ready.set(true);
      },
    });
  }

  initializeDraft(userId: string, cvId: string, template: CvTemplate): void {
    this.releasePendingPhoto();
    this.activeUserId = userId;
    this.activeCvId = cvId;
    this.isDraft.set(true);
    this.loading.set(true);
    this.ready.set(false);
    this.error.set(null);
    this.validationAttempt.set(0);
    this.invalidSections.set(new Set());
    this.userSkills.set([]);
    this.reusableExperiences.set([]);
    this.reusableEducation.set([]);

    forkJoin({
      profile: this.api.getProfile(userId).pipe(
        catchError((error: HttpErrorResponse) => {
          this.error.set(
            this.getErrorMessage(error, 'Failed to load profile details'),
          );
          return of(null);
        }),
      ),
      skills: this.api.getUserSkills(userId).pipe(catchError(() => of([]))),
      library: this.api
        .getCvSectionLibrary(userId)
        .pipe(
          catchError(() =>
            of({ experience: [], education: [] } as CvSectionLibrary),
          ),
        ),
    }).subscribe(({ profile, skills, library }) => {
      const draft = this.createDefaultData(template);
      if (profile) {
        draft.personal.fullName = [profile.firstName, profile.lastName]
          .map((part) => part.trim())
          .filter(Boolean)
          .join(' ');
        draft.personal.city = profile.location?.trim() || '';
      }

      this.updateState(draft);
      this.metadata.set({
        id: cvId,
        title: 'Untitled CV',
        ownerEmail: '',
      });
      this.userSkills.set(
        skills.map((skill) => ({
          name: skill.name,
          icon: skill.icon ?? null,
        })),
      );
      this.setCvSectionLibrary(library);
      this.loading.set(false);
      this.ready.set(true);
    });
  }

  loadPublic(cvId: string) {
    this.releasePendingPhoto();
    this.activeUserId = '';
    this.activeCvId = '';
    this.isDraft.set(false);
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
        this.updateState(this.createDefaultData());
        this.metadata.set(null);
        this.ready.set(true);
      },
    });
  }

  saveToDB(
    userId: string,
    cvId: string,
    callback?: (savedCvId: string) => void,
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
    const saveRequest = this.isDraft()
      ? this.api.createCvFromDraft(userId, cvId, cvData)
      : this.api.saveCv(userId, cvId, cvData);

    saveRequest.subscribe({
      next: ({ cvId: savedCvId }) => {
        this.activeCvId = savedCvId;
        this.isDraft.set(false);
        if (this.pendingPhotoFile) {
          this.savePendingPhoto(userId, savedCvId, callback, errorCallback);
          return;
        }
        this.completeSave(savedCvId, callback);
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
      additionalSections: (apiData.additionalSections || [])
        .filter((item) => isAdditionalSectionType(item.type))
        .map((item) => ({
          id: item.id || crypto.randomUUID(),
          type: item.type,
          sectionTitle: item.sectionTitle || '',
          title: item.title || '',
          subtitle: item.subtitle || '',
          description: item.description || '',
          startDate: item.startDate || '',
          endDate: item.endDate || '',
          url: item.url || '',
          level: item.level || '',
          location: item.location || '',
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
        photo: this.pendingPhotoFile ? '' : storeData.personal.photo,
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
      additionalSections: storeData.additionalSections,
      generalSkills: storeData.generalSkills,
      experienceSkillMode: storeData.experienceSkillMode,
      sectionOrder: storeData.sectionOrder,
      template: storeData.template,
    };
  }

  updatePersonal(personal: PersonalData) {
    this.updateState({ ...this.cv(), personal });
  }

  addExperience(source: Partial<ExperienceItem> = {}) {
    const item: ExperienceItem = {
      id: crypto.randomUUID(),
      company: source.company || '',
      position: source.position || '',
      startDate: source.startDate || '',
      endDate: source.endDate || '',
      current: source.current ?? false,
      description: source.description || '',
      skills: (source.skills || []).map((skill) => ({ ...skill })),
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

  addEducation(source: Partial<EducationItem> = {}) {
    const item: EducationItem = {
      id: crypto.randomUUID(),
      institution: source.institution || '',
      degree: source.degree || '',
      field: source.field || '',
      year: source.year || '',
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

  addAdditionalSection(type: AdditionalSectionType): AdditionalSectionItem {
    const item = createAdditionalSectionItem(type, crypto.randomUUID());
    this.updateState({
      ...this.cv(),
      additionalSections: [...this.cv().additionalSections, item],
    });
    return item;
  }

  updateAdditionalSection(
    id: string,
    patch: Partial<AdditionalSectionItem>,
  ): void {
    const additionalSections = this.cv().additionalSections.map((item) =>
      item.id === id ? { ...item, ...patch, id: item.id, type: item.type } : item,
    );
    this.updateState({ ...this.cv(), additionalSections });
  }

  removeAdditionalSection(id: string): void {
    this.updateState({
      ...this.cv(),
      additionalSections: this.cv().additionalSections.filter(
        (item) => item.id !== id,
      ),
    });
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

  generateSkillIcon(skillName: string): Observable<SkillIconGenerationResult> {
    if (!this.activeUserId) {
      return throwError(() => new Error('Active CV is not loaded'));
    }
    return this.api.generateSkillIcon(
      this.activeUserId,
      this.isDraft() ? null : this.activeCvId,
      skillName,
    );
  }

  uploadProfilePhoto(file: File): void {
    if (!this.activeUserId || !this.activeCvId) return;

    if (this.isDraft()) {
      if (file.size > 5 * 1024 * 1024) {
        this.error.set('Photo must be 5 MB or smaller');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        this.error.set('Photo must be JPEG, PNG, or WebP');
        return;
      }

      this.releasePendingPhoto();
      this.pendingPhotoFile = file;
      this.pendingPhotoUrl = URL.createObjectURL(file);
      this.updatePersonal({
        ...this.cv().personal,
        photo: this.pendingPhotoUrl,
      });
      return;
    }

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
    if (this.pendingPhotoFile) {
      this.releasePendingPhoto();
    }
    this.updatePersonal({ ...this.cv().personal, photo: '' });
  }

  updateSectionOrder(sectionOrder: CvSection['id'][]) {
    this.updateState({ ...this.cv(), sectionOrder });
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

  private loadCvSectionLibrary(userId: string, cvId?: string): void {
    this.api.getCvSectionLibrary(userId, cvId).subscribe({
      next: (library) => this.setCvSectionLibrary(library),
      error: () => {
        this.reusableExperiences.set([]);
        this.reusableEducation.set([]);
      },
    });
  }

  private setCvSectionLibrary(library: CvSectionLibrary): void {
    this.reusableExperiences.set(
      (library.experience || []).map((item) => ({
        id: item.id || crypto.randomUUID(),
        company: item.company || '',
        position: item.position || '',
        startDate: item.startDate || '',
        endDate: item.endDate || '',
        current: item.current ?? false,
        description: item.description || '',
        skills: (item.skills || []).map((skill) =>
          typeof skill === 'string'
            ? { name: skill, icon: null }
            : { name: skill.name, icon: skill.icon || null },
        ),
      })),
    );
    this.reusableEducation.set(
      (library.education || []).map((item) => ({
        id: item.id || crypto.randomUUID(),
        institution: item.institution || '',
        degree: item.degree || '',
        field: item.field || '',
        year: item.year || '',
      })),
    );
  }

  private savePendingPhoto(
    userId: string,
    cvId: string,
    callback?: (savedCvId: string) => void,
    errorCallback?: () => void,
  ): void {
    const photoFile = this.pendingPhotoFile;
    if (!photoFile) {
      this.completeSave(cvId, callback);
      return;
    }

    this.photoUploading.set(true);
    this.api.uploadCvPhoto(userId, cvId, photoFile).subscribe({
      next: ({ photoUrl }) => {
        this.updatePersonal({ ...this.cv().personal, photo: photoUrl });
        this.releasePendingPhoto();
        this.api.saveCv(userId, cvId, this.mapStoreDataToApi(this.cv())).subscribe({
          next: () => {
            this.photoUploading.set(false);
            this.completeSave(cvId, callback);
          },
          error: (error: HttpErrorResponse) => {
            this.photoUploading.set(false);
            this.loading.set(false);
            this.error.set(
              this.getErrorMessage(error, 'Failed to save uploaded photo'),
            );
            errorCallback?.();
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.photoUploading.set(false);
        this.loading.set(false);
        this.error.set(this.getErrorMessage(error, 'Failed to upload photo'));
        errorCallback?.();
      },
    });
  }

  private completeSave(
    cvId: string,
    callback?: (savedCvId: string) => void,
  ): void {
    const currentMetadata = this.metadata();
    this.metadata.set({
      id: cvId,
      ownerEmail: currentMetadata?.ownerEmail ?? '',
      title:
        this.cv().personal.fullName.trim() ||
        this.cv().personal.jobTitle.trim() ||
        currentMetadata?.title ||
        'Untitled CV',
    });
    this.loading.set(false);
    callback?.(cvId);
  }

  private createDefaultData(template: CvTemplate = 'single'): CvData {
    return {
      ...DEFAULT_DATA,
      personal: { ...DEFAULT_DATA.personal },
      experience: [],
      education: [],
      additionalSections: [],
      generalSkills: [],
      sectionOrder: [...DEFAULT_DATA.sectionOrder],
      template,
    };
  }

  private releasePendingPhoto(): void {
    if (this.pendingPhotoUrl) {
      URL.revokeObjectURL(this.pendingPhotoUrl);
    }
    this.pendingPhotoFile = null;
    this.pendingPhotoUrl = '';
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

    if (
      !personal.summary.trim() ||
      personal.summary.trim().length < CV_MIN_TEXT_LENGTH ||
      personal.summary.trim().length > CV_FIELD_LIMITS.longText
    ) {
      invalidSections.add(data.template === 'classic' ? 'details' : 'personal');
    }

    if (
      personal.email.trim().length > CV_FIELD_LIMITS.email ||
      !STRICT_EMAIL_PATTERN.test(personal.email.trim()) ||
      !PHONE_PATTERN.test(personal.phone.trim()) ||
      !this.isValidShortText(personal.city)
    ) {
      invalidSections.add(data.template === 'classic' ? 'details' : 'personal');
    }

    if (data.experience.some((item) => !this.isValidExperience(item))) {
      invalidSections.add('experience');
    }

    if (
      data.generalSkills.some(
        (skill) => skill.trim().length > CV_FIELD_LIMITS.skill,
      )
    ) {
      invalidSections.add('skills');
    }

    if (data.education.some((item) => !this.isValidEducation(item))) {
      invalidSections.add('education');
    }

    if (
      data.additionalSections.some(
        (item) => !this.isValidAdditionalSection(item),
      )
    ) {
      invalidSections.add('additional');
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
      if (value.length < CV_MIN_TEXT_LENGTH) {
        return `${label} must be at least ${CV_MIN_TEXT_LENGTH} characters`;
      }
      const maxLength =
        field === 'summary'
          ? CV_FIELD_LIMITS.longText
          : field === 'email'
            ? CV_FIELD_LIMITS.email
            : field === 'phone'
              ? CV_FIELD_LIMITS.phone
              : CV_FIELD_LIMITS.shortText;
      if (value.length > maxLength) {
        return `${label} must be ${maxLength} characters or fewer`;
      }
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
      if (item.description.trim().length > CV_FIELD_LIMITS.longText) {
        return `Experience ${i + 1} description must be ${CV_FIELD_LIMITS.longText} characters or fewer`;
      }
      if (
        item.skills.some(
          (skill) =>
            !skill.name.trim() ||
            skill.name.trim().length > CV_FIELD_LIMITS.skill,
        )
      ) {
        return `Experience ${i + 1} contains an invalid skill name`;
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

    for (let i = 0; i < data.additionalSections.length; i += 1) {
      const item = data.additionalSections[i];
      if (item.title.trim().length < 2) {
        return `Additional entry ${i + 1} requires a title`;
      }
      if (item.title.trim().length > CV_FIELD_LIMITS.shortText) {
        return `Additional entry ${i + 1} title must be ${CV_FIELD_LIMITS.shortText} characters or fewer`;
      }
      if (item.type === 'custom' && item.sectionTitle.trim().length < 2) {
        return `Additional entry ${i + 1} requires a section name`;
      }
      if (
        item.sectionTitle.trim().length > CV_FIELD_LIMITS.shortText ||
        item.subtitle.trim().length > CV_FIELD_LIMITS.shortText ||
        item.location.trim().length > CV_FIELD_LIMITS.shortText ||
        item.description.trim().length > CV_FIELD_LIMITS.longText ||
        item.url.trim().length > CV_FIELD_LIMITS.url
      ) {
        return `Additional entry ${i + 1} exceeds a character limit`;
      }
      if (item.type === 'language' && !item.level.trim()) {
        return `Additional entry ${i + 1} requires a language level`;
      }
      if (item.type === 'link' && !item.url.trim()) {
        return `Additional entry ${i + 1} requires a URL`;
      }
      if (item.url.trim() && !this.isValidUrl(item.url)) {
        return `Additional entry ${i + 1} contains an invalid URL`;
      }
    }

    if (
      data.generalSkills.some(
        (skill) =>
          !skill.trim() || skill.trim().length > CV_FIELD_LIMITS.skill,
      )
    ) {
      return `Skills must be ${CV_FIELD_LIMITS.skill} characters or fewer`;
    }

    return null;
  }

  private isValidShortText(value: string): boolean {
    const trimmed = value.trim();
    return (
      trimmed.length >= CV_MIN_TEXT_LENGTH &&
      trimmed.length <= CV_FIELD_LIMITS.shortText &&
      SHORT_TEXT_PATTERN.test(trimmed)
    );
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
    return (
      item.description.trim().length >= CV_MIN_TEXT_LENGTH &&
      item.description.trim().length <= CV_FIELD_LIMITS.longText &&
      item.skills.every(
        (skill) =>
          Boolean(skill.name.trim()) &&
          skill.name.trim().length <= CV_FIELD_LIMITS.skill,
      )
    );
  }

  private isValidEducation(item: EducationItem): boolean {
    return (
      this.isValidShortText(item.institution) &&
      this.isValidShortText(item.degree) &&
      this.isValidShortText(item.field) &&
      YEAR_PATTERN.test(item.year)
    );
  }

  private isValidAdditionalSection(item: AdditionalSectionItem): boolean {
    return (
      item.title.trim().length >= 2 &&
      item.title.trim().length <= CV_FIELD_LIMITS.shortText &&
      item.sectionTitle.trim().length <= CV_FIELD_LIMITS.shortText &&
      item.subtitle.trim().length <= CV_FIELD_LIMITS.shortText &&
      item.location.trim().length <= CV_FIELD_LIMITS.shortText &&
      item.description.trim().length <= CV_FIELD_LIMITS.longText &&
      item.url.trim().length <= CV_FIELD_LIMITS.url &&
      (item.type !== 'custom' ||
        (item.sectionTitle.trim().length >= CV_MIN_TEXT_LENGTH &&
          item.sectionTitle.trim().length <= CV_FIELD_LIMITS.shortText)) &&
      (item.type !== 'language' || Boolean(item.level.trim())) &&
      (item.type !== 'link' || Boolean(item.url.trim())) &&
      (!item.url.trim() || this.isValidUrl(item.url))
    );
  }

  private isValidUrl(value: string): boolean {
    try {
      const url = new URL(value.trim());
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  private parseDate(value: string): Date | null {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
