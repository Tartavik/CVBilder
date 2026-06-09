import { Injectable, signal } from '@angular/core';

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
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
}

export interface CvSection {
  id: 'personal' | 'experience' | 'education' | 'skills';
  label: string;
}

export type CvTemplate = 'single' | 'classic';

export interface CvData {
  personal: PersonalData;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  sectionOrder: CvSection['id'][];
  template: CvTemplate;
}

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
  skills: [],
  sectionOrder: ['personal', 'experience', 'education', 'skills'],
  template: 'single',
};

const STORAGE_KEY = 'cvbilder_cv';

function loadFromStorage(): CvData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : { ...DEFAULT_DATA };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

@Injectable({ providedIn: 'root' })
export class CvStore {
  readonly cv = signal<CvData>(loadFromStorage());

  readonly sections: CvSection[] = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
  ];

  private save(data: CvData) {
    this.cv.set(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  updatePersonal(personal: PersonalData) {
    this.save({ ...this.cv(), personal });
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
    };
    this.save({ ...this.cv(), experience: [...this.cv().experience, item] });
  }

  updateExperience(id: string, patch: Partial<ExperienceItem>) {
    const experience = this.cv().experience.map((e) =>
      e.id === id ? { ...e, ...patch } : e
    );
    this.save({ ...this.cv(), experience });
  }

  removeExperience(id: string) {
    this.save({ ...this.cv(), experience: this.cv().experience.filter((e) => e.id !== id) });
  }

  addEducation() {
    const item: EducationItem = {
      id: crypto.randomUUID(),
      institution: '',
      degree: '',
      field: '',
      year: '',
    };
    this.save({ ...this.cv(), education: [...this.cv().education, item] });
  }

  updateEducation(id: string, patch: Partial<EducationItem>) {
    const education = this.cv().education.map((e) =>
      e.id === id ? { ...e, ...patch } : e
    );
    this.save({ ...this.cv(), education });
  }

  removeEducation(id: string) {
    this.save({ ...this.cv(), education: this.cv().education.filter((e) => e.id !== id) });
  }

  updateSkills(skills: string[]) {
    this.save({ ...this.cv(), skills });
  }

  updateSectionOrder(sectionOrder: CvSection['id'][]) {
    this.save({ ...this.cv(), sectionOrder });
  }

  updateTemplate(template: CvTemplate) {
    this.save({ ...this.cv(), template });
  }
}
