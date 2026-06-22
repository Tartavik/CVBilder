import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly router = inject(Router);
  currentUserId = signal<string | null>(this.getStoredUserId());

  setCurrentUser(userId: string): void {
    this.currentUserId.set(userId);
    sessionStorage.setItem('currentUserId', userId);
  }

  getCurrentUserId(): string | null {
    return this.currentUserId();
  }

  isLoggedIn(): boolean {
    return Boolean(this.currentUserId());
  }

  private getStoredUserId(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem('currentUserId');
  }

  logout(): void {
    this.currentUserId.set(null);
    sessionStorage.removeItem('currentUserId');
    this.router.navigate(['/login']);
  }
}
