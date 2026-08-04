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

export interface AuthResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
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
  hidden: boolean;
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
  isPublished?: boolean;
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
  isPublished: boolean;
}

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
  private readonly me = `${this.base}/me`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  register(email: string, password: string): Observable<User> {
    return this.http.post<User>('/api/auth/register', { email, password });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    });
  }

  getUserCvs(): Observable<CvSummary[]> {
    return this.http.get<CvSummary[]>(`${this.me}/cvs`);
  }

  getUserSkills(): Observable<UserSkill[]> {
    return this.http.get<UserSkill[]>(`${this.me}/skills`);
  }

  deleteUserSkill(skillName: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(`${this.me}/skills`, {
      body: { skillName },
    });
  }

  getCvSectionLibrary(cvId?: string): Observable<CvSectionLibrary> {
    if (!cvId) {
      return this.http.get<CvSectionLibrary>(`${this.me}/cv-library`);
    }
    return this.http.get<CvSectionLibrary>(`${this.me}/cvs/${cvId}/library`);
  }

  getProfile(): Observable<UserProfile | null> {
    return this.http.get<UserProfile | null>(`${this.me}/profile`);
  }

  updateProfile(profile: Omit<UserProfile, 'id'>): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.me}/profile`, profile);
  }

  getSettings(): Observable<UserSettings | null> {
    return this.http.get<UserSettings | null>(`${this.me}/settings`);
  }

  updateSettings(
    settings: Pick<UserSettings, 'theme'>,
  ): Observable<UserSettings> {
    return this.http.patch<UserSettings>(`${this.me}/settings`, settings);
  }

  getAllCvs(query: CvListQuery): Observable<PaginatedCvs> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize)
      .set('sortBy', query.sortBy)
      .set('sortOrder', query.sortOrder);

    if (query.author) params = params.set('author', query.author);
    if (query.query) params = params.set('query', query.query);
    if (query.createdFrom) {
      params = params.set('createdFrom', query.createdFrom);
    }
    if (query.createdTo) params = params.set('createdTo', query.createdTo);
    if (query.skills.length) {
      params = params.set('skills', query.skills.join(','));
    }

    return this.http.get<PaginatedCvs>('/api/cvs', { params });
  }

  getCvFilterOptions(): Observable<CvFilterOptions> {
    return this.http.get<CvFilterOptions>('/api/cvs/filters');
  }

  saveCv(
    cvId: string,
    cvData: CvData,
  ): Observable<{ success: boolean; cvId: string; isPublished: boolean }> {
    return this.http.put<{
      success: boolean;
      cvId: string;
      isPublished: boolean;
    }>(`${this.me}/cvs/${cvId}`, cvData);
  }

  createCvFromDraft(
    cvId: string,
    cvData: CvData,
  ): Observable<{ success: boolean; cvId: string; isPublished: boolean }> {
    return this.http.post<{
      success: boolean;
      cvId: string;
      isPublished: boolean;
    }>(`${this.me}/cvs/${cvId}`, cvData);
  }

  setCvPublication(
    cvId: string,
    isPublished: boolean,
  ): Observable<{ isPublished: boolean }> {
    return this.http.patch<{ isPublished: boolean }>(
      `${this.me}/cvs/${cvId}/publication`,
      { isPublished },
    );
  }

  getCv(cvId: string): Observable<CvData> {
    return this.http.get<CvData>(`${this.me}/cvs/${cvId}`);
  }

  getPublicCv(cvId: string): Observable<CvData> {
    return this.http.get<CvData>(`/api/cvs/${cvId}`);
  }

  deleteCv(cvId: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(`${this.me}/cvs/${cvId}`);
  }

  uploadCvPhoto(cvId: string, file: File): Observable<{ photoUrl: string }> {
    const body = new FormData();
    body.append('photo', file);
    return this.http.post<{ photoUrl: string }>(
      `${this.me}/cvs/${cvId}/photo`,
      body,
    );
  }

  generateSkillIcon(
    cvId: string | null,
    skillName: string,
  ): Observable<SkillIconGenerationResult> {
    if (!cvId) {
      return this.http.post<SkillIconGenerationResult>(
        `${this.me}/skills/icon/generate`,
        { skillName },
      );
    }
    return this.http.post<SkillIconGenerationResult>(
      `${this.me}/cvs/${cvId}/skills/icon/generate`,
      { skillName },
    );
  }

  deleteCvPhoto(cvId: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(`${this.me}/cvs/${cvId}/photo`);
  }
}
