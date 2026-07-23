import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdditionalSectionItem } from './cv/additional-sections';

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface PersonalData {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  city: string;
  summary: string;
  photo?: string;
}

export interface ExperienceSkill {
  name: string;
  icon?: string | null;
}

export interface UserSkill {
  name: string;
  icon: string | null;
}

export interface SkillIconGenerationResult {
  icon: string;
  source: 'generated' | 'found';
}

export interface ExperienceItem {
  id?: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  skills?: Array<ExperienceSkill | string>;
}

export interface EducationItem {
  id?: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
}

export interface CvSectionLibrary {
  experience: ExperienceItem[];
  education: EducationItem[];
}

export interface CvData {
  id?: string;
  title?: string;
  ownerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  personal: PersonalData;
  experience: ExperienceItem[];
  education: EducationItem[];
  additionalSections?: AdditionalSectionItem[];
  generalSkills?: string[];
  experienceSkillMode?: 'text' | 'icons';
  sectionOrder?: string[];
  template?: 'single' | 'classic';
}

export interface CvSummary {
  id: string;
  title: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export type CvTemplate = 'single' | 'classic';
export type ThemeMode = 'light' | 'dark';

export interface UserSettings {
  id?: string;
  theme: ThemeMode;
}

export interface UserProfile {
  id?: string;
  firstName: string;
  lastName: string;
  location: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly base = '/api/users';
  private readonly http = inject(HttpClient);

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  register(email: string, password: string): Observable<User> {
    return this.http.post<User>(this.base, { email, password });
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.base}/login`, { email, password });
  }

  getUserCvs(userId: string): Observable<CvSummary[]> {
    return this.http.get<CvSummary[]>(`${this.base}/${userId}/cvs`);
  }

  getUserSkills(userId: string): Observable<UserSkill[]> {
    return this.http.get<UserSkill[]>(`${this.base}/${userId}/skills`);
  }

  getCvSectionLibrary(
    userId: string,
    cvId?: string,
  ): Observable<CvSectionLibrary> {
    if (!cvId) {
      return this.http.get<CvSectionLibrary>(
        `${this.base}/${userId}/cv-library`,
      );
    }
    return this.http.get<CvSectionLibrary>(
      `${this.base}/${userId}/cvs/${cvId}/library`,
    );
  }

  getProfile(userId: string): Observable<UserProfile | null> {
    return this.http.get<UserProfile | null>(`${this.base}/${userId}/profile`);
  }

  updateProfile(
    userId: string,
    profile: Omit<UserProfile, 'id'>,
  ): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.base}/${userId}/profile`, profile);
  }

  getSettings(userId: string): Observable<UserSettings | null> {
    return this.http.get<UserSettings | null>(`${this.base}/${userId}/settings`);
  }

  updateSettings(
    userId: string,
    settings: Pick<UserSettings, 'theme'>,
  ): Observable<UserSettings> {
    return this.http.patch<UserSettings>(
      `${this.base}/${userId}/settings`,
      settings,
    );
  }

  getAllCvs(skills: string[] = []): Observable<CvSummary[]> {
    const params = skills.length
      ? new HttpParams().set('skills', skills.join(','))
      : undefined;
    return this.http.get<CvSummary[]>('/api/cvs', { params });
  }

  saveCv(
    userId: string,
    cvId: string,
    cvData: CvData,
  ): Observable<{ success: boolean; cvId: string }> {
    return this.http.put<{ success: boolean; cvId: string }>(
      `${this.base}/${userId}/cvs/${cvId}`,
      cvData,
    );
  }

  createCvFromDraft(
    userId: string,
    cvId: string,
    cvData: CvData,
  ): Observable<{ success: boolean; cvId: string }> {
    return this.http.post<{ success: boolean; cvId: string }>(
      `${this.base}/${userId}/cvs/${cvId}`,
      cvData,
    );
  }

  getCv(userId: string, cvId: string): Observable<CvData> {
    return this.http.get<CvData>(`${this.base}/${userId}/cvs/${cvId}`);
  }

  getPublicCv(cvId: string): Observable<CvData> {
    return this.http.get<CvData>(`/api/cvs/${cvId}`);
  }

  deleteCv(
    userId: string,
    cvId: string,
  ): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.base}/${userId}/cvs/${cvId}`,
    );
  }

  uploadCvPhoto(
    userId: string,
    cvId: string,
    file: File,
  ): Observable<{ photoUrl: string }> {
    const body = new FormData();
    body.append('photo', file);
    return this.http.post<{ photoUrl: string }>(
      `${this.base}/${userId}/cvs/${cvId}/photo`,
      body,
    );
  }

  generateSkillIcon(
    userId: string,
    cvId: string | null,
    skillName: string,
  ): Observable<SkillIconGenerationResult> {
    if (!cvId) {
      return this.http.post<SkillIconGenerationResult>(
        `${this.base}/${userId}/skills/icon/generate`,
        { skillName },
      );
    }
    return this.http.post<SkillIconGenerationResult>(
      `${this.base}/${userId}/cvs/${cvId}/skills/icon/generate`,
      { skillName },
    );
  }

  deleteCvPhoto(
    userId: string,
    cvId: string,
  ): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.base}/${userId}/cvs/${cvId}/photo`,
    );
  }
}
