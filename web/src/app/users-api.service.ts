import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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

export interface CvData {
  id?: string;
  title?: string;
  ownerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  personal: PersonalData;
  experience: ExperienceItem[];
  education: EducationItem[];
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

  createCv(userId: string): Observable<CvSummary> {
    return this.http.post<CvSummary>(`${this.base}/${userId}/cvs`, {});
  }

  getUserCvs(userId: string): Observable<CvSummary[]> {
    return this.http.get<CvSummary[]>(`${this.base}/${userId}/cvs`);
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

  getCv(userId: string, cvId: string): Observable<CvData> {
    return this.http.get<CvData>(`${this.base}/${userId}/cvs/${cvId}`);
  }

  getPublicCv(cvId: string): Observable<CvData> {
    return this.http.get<CvData>(`/api/cvs/${cvId}`);
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

  deleteCvPhoto(
    userId: string,
    cvId: string,
  ): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.base}/${userId}/cvs/${cvId}/photo`,
    );
  }
}
