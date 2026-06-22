import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { AppIconComponent } from '../shared/app-icon.component';
import { CvSummary, UsersApiService } from '../users-api.service';
import { ErrorService } from '../shared/errors/error.service';

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
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly api = inject(UsersApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorService);

  readonly myCvs = signal<CvSummary[]>([]);
  readonly allCvs = signal<CvSummary[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly searching = signal(false);
  readonly error = signal('');
  readonly skillSearch = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    const userId = this.auth.getCurrentUserId() as string;

    forkJoin({
      current: this.api.getUserCvs(userId),
      all: this.api.getAllCvs(),
    }).subscribe({
      next: ({ current, all }) => {
        this.myCvs.set(current);
        this.allCvs.set(all);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errors.getMessage(error, 'Failed to load CVs'));
        this.loading.set(false);
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
