import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';
import { ThemeMode, UserSettings, UsersApiService } from '../users-api.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly api = inject(UsersApiService);

  readonly theme = signal<ThemeMode>('light');
  readonly saving = signal(false);

  load(): Observable<UserSettings | null> {
    return this.api.getSettings().pipe(
      tap((settings) => this.apply(settings?.theme ?? 'light')),
      catchError(() => {
        this.apply('light');
        return of(null);
      }),
    );
  }

  save(theme: ThemeMode): Observable<UserSettings> {
    this.saving.set(true);
    this.apply(theme);
    return this.api.updateSettings({ theme }).pipe(
      tap((settings) => this.apply(settings.theme)),
      finalize(() => this.saving.set(false)),
    );
  }

  apply(theme: ThemeMode): void {
    this.theme.set(theme);
    document.body.dataset['appTheme'] = theme;
  }
}
