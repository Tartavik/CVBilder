import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { AppIconComponent } from '../shared/app-icon.component';
import { CvSummary, ThemeMode, UsersApiService } from '../users-api.service';
import { ErrorService } from '../shared/errors/error.service';
import { DashboardSettingsComponent } from './dashboard-settings/dashboard-settings.component';
import { ThemeService } from '../shared/theme.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    AppIconComponent,
    DashboardSettingsComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly api = inject(UsersApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorService);
  private readonly themeService = inject(ThemeService);

  readonly myCvs = signal<CvSummary[]>([]);
  readonly allCvs = signal<CvSummary[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly searching = signal(false);
  readonly profileSaving = signal(false);
  readonly themeSaving = this.themeService.saving;
  readonly theme = this.themeService.theme;
  readonly error = signal('');
  readonly profileMessage = signal('');
  readonly skillSearch = new FormControl('', { nonNullable: true });
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
    const userId = this.auth.getCurrentUserId() as string;

    forkJoin({
      current: this.api.getUserCvs(userId),
      all: this.api.getAllCvs(),
      settings: this.themeService.load(userId),
      profile: this.api.getProfile(userId),
    }).subscribe({
      next: ({ current, all, profile }) => {
        this.myCvs.set(current);
        this.allCvs.set(all);
        if (profile) {
          this.profileForm.patchValue({
            firstName: profile.firstName,
            lastName: profile.lastName,
            location: profile.location ?? '',
          });
        }
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errors.getMessage(error, 'Failed to load CVs'));
        this.loading.set(false);
      },
    });
  }

  toggleTheme(): void {
    if (this.themeSaving()) return;
    const nextTheme: ThemeMode = this.theme() === 'light' ? 'dark' : 'light';
    const previousTheme = this.theme();
    const userId = this.auth.getCurrentUserId() as string;

    this.themeService.save(userId, nextTheme).subscribe({
      next: (settings) => {
        this.themeService.apply(settings.theme);
      },
      error: (error: HttpErrorResponse) => {
        this.themeService.apply(previousTheme);
        this.error.set(this.errors.getMessage(error, 'Failed to save theme'));
      },
    });
  }

  saveProfile(): void {
    if (this.profileSaving() || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const userId = this.auth.getCurrentUserId() as string;
    const value = this.profileForm.getRawValue();
    this.profileSaving.set(true);
    this.profileMessage.set('');
    this.error.set('');

    this.api
      .updateProfile(userId, {
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        location: value.location.trim() || null,
      })
      .subscribe({
        next: () => {
          this.profileSaving.set(false);
          this.profileMessage.set('Profile saved');
        },
        error: (error: HttpErrorResponse) => {
          this.profileSaving.set(false);
          this.error.set(this.errors.getMessage(error, 'Failed to save profile'));
        },
      });
  }

  createCv(): void {
    if (this.creating()) return;
    const userId = this.auth.getCurrentUserId() as string;

    this.creating.set(true);
    this.error.set('');
    this.api.createCv(userId).subscribe({
      next: (cv) => this.router.navigate(['/cv', cv.id, 'edit']),
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errors.getMessage(error, 'Failed to create CV'));
        this.creating.set(false);
      },
    });
  }

  searchCvs(): void {
    const skills = this.skillSearch.value
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    this.searching.set(true);
    this.error.set('');
    this.api.getAllCvs(skills).subscribe({
      next: (cvs) => {
        this.allCvs.set(cvs);
        this.searching.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errors.getMessage(error, 'Failed to search CVs'));
        this.searching.set(false);
      },
    });
  }

  clearSearch(): void {
    this.skillSearch.reset();
    this.searchCvs();
  }

  logout(): void {
    this.auth.logout();
  }
}
