import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly storedSession = this.getStoredSession();
  readonly currentUserId = signal<string | null>(
    this.storedSession?.userId ?? null,
  );
  private readonly accessToken = signal<string | null>(
    this.storedSession?.accessToken ?? null,
  );

  setSession(userId: string, accessToken: string): void {
    this.currentUserId.set(userId);
    this.accessToken.set(accessToken);
    sessionStorage.setItem('currentUserId', userId);
    sessionStorage.setItem('accessToken', accessToken);
  }

  getCurrentUserId(): string | null {
    return this.currentUserId();
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  isLoggedIn(): boolean {
    return Boolean(this.currentUserId() && this.accessToken());
  }

  private getStoredSession(): {
    userId: string;
    accessToken: string;
  } | null {
    if (typeof sessionStorage === 'undefined') return null;

    const userId = sessionStorage.getItem('currentUserId');
    const accessToken = sessionStorage.getItem('accessToken');
    if (!userId || !accessToken || this.isExpired(accessToken)) {
      sessionStorage.removeItem('currentUserId');
      sessionStorage.removeItem('accessToken');
      return null;
    }

    return { userId, accessToken };
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  expireSession(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private clearSession(): void {
    this.currentUserId.set(null);
    this.accessToken.set(null);
    sessionStorage.removeItem('currentUserId');
    sessionStorage.removeItem('accessToken');
  }

  private isExpired(accessToken: string): boolean {
    try {
      const encodedPayload = accessToken.split('.')[1];
      if (!encodedPayload) return true;

      const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(paddedBase64)) as { exp?: number };
      return (
        typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()
      );
    } catch {
      return true;
    }
  }
}
