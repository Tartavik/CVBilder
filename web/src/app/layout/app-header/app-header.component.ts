import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { DashboardSettingsComponent } from '../../home/dashboard-settings/dashboard-settings.component';
import { AppIconComponent } from '../../shared/app-icon.component';
import { ErrorService } from '../../shared/errors/error.service';
import { ThemeService } from '../../shared/theme.service';
import { ThemeMode, UsersApiService } from '../../users-api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    AppIconComponent,
    DashboardSettingsComponent,
    MatTooltipModule,
    RouterLink,
  ],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(UsersApiService);
  private readonly errors = inject(ErrorService);
  private readonly themeService = inject(ThemeService);

  readonly isLoggedIn = computed(() => Boolean(this.auth.currentUserId()));
  readonly theme = this.themeService.theme;
  readonly themeSaving = this.themeService.saving;
  readonly profileSaving = signal(false);
  readonly profileMessage = signal('');
  readonly profileMessageIsError = signal(false);
  readonly profileForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    location: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const userId = this.auth.getCurrentUserId();
    if (!userId) return;

    this.themeService.load(userId).subscribe();
    this.api.getProfile(userId).subscribe({
      next: (profile) => {
        if (!profile) return;
        this.profileForm.patchValue({
          firstName: profile.firstName,
          lastName: profile.lastName,
          location: profile.location ?? '',
        });
      },
      error: (error: HttpErrorResponse) => {
        this.setProfileMessage(
          this.errors.getMessage(error, 'Failed to load profile'),
          true,
        );
      },
    });
  }

  toggleTheme(): void {
    if (this.themeSaving()) return;

    const userId = this.auth.getCurrentUserId();
    if (!userId) return;

    const previousTheme = this.theme();
    const nextTheme: ThemeMode = previousTheme === 'light' ? 'dark' : 'light';

    this.themeService.save(userId, nextTheme).subscribe({
      error: (error: HttpErrorResponse) => {
        this.themeService.apply(previousTheme);
        this.setProfileMessage(
          this.errors.getMessage(error, 'Failed to save theme'),
          true,
        );
      },
    });
  }

  saveProfile(): void {
    if (this.profileSaving() || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const userId = this.auth.getCurrentUserId();
    if (!userId) return;

    const value = this.profileForm.getRawValue();
    this.profileSaving.set(true);
    this.profileMessage.set('');

    this.api
      .updateProfile(userId, {
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        location: value.location.trim() || null,
      })
      .subscribe({
        next: () => {
          this.profileSaving.set(false);
          this.setProfileMessage('Profile saved', false);
        },
        error: (error: HttpErrorResponse) => {
          this.profileSaving.set(false);
          this.setProfileMessage(
            this.errors.getMessage(error, 'Failed to save profile'),
            true,
          );
        },
      });
  }

  logout(): void {
    this.auth.logout();
  }

  private setProfileMessage(message: string, isError: boolean): void {
    this.profileMessage.set(message);
    this.profileMessageIsError.set(isError);
  }
}
