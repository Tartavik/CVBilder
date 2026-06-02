import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
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
}
