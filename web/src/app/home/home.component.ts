import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { AppIconComponent } from '../shared/app-icon.component';
import {
  CvSummary,
  CvTemplate,
  UsersApiService,
} from '../users-api.service';
import { ErrorService } from '../shared/errors/error.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { TemplatePickerDialogComponent } from './template-picker-dialog/template-picker-dialog.component';

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
  private readonly dialog = inject(MatDialog);

  readonly myCvs = signal<CvSummary[]>([]);
  readonly allCvs = signal<CvSummary[]>([]);
  readonly loading = signal(true);
  readonly searching = signal(false);
  readonly deletingCvId = signal<string | null>(null);
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
    const dialogRef = this.dialog.open(TemplatePickerDialogComponent, {
      autoFocus: false,
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'template-picker-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((template) => {
      if (!template) return;
      this.openCvDraft(template);
    });
  }

  private openCvDraft(template: CvTemplate): void {
    this.router.navigate(['/cv', crypto.randomUUID(), 'edit'], {
      queryParams: { draft: '1', template },
    });
  }

  confirmDeleteCv(cv: CvSummary): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: 'calc(100vw - 24px)',
      autoFocus: false,
      data: {
        title: 'Delete CV?',
        message: `Are you sure you want to delete "${cv.title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.deleteCv(cv.id);
    });
  }

  private deleteCv(cvId: string): void {
    const userId = this.auth.getCurrentUserId() as string;
    this.deletingCvId.set(cvId);
    this.error.set('');

    this.api.deleteCv(userId, cvId).subscribe({
      next: () => {
        this.myCvs.update((cvs) => cvs.filter((cv) => cv.id !== cvId));
        this.allCvs.update((cvs) => cvs.filter((cv) => cv.id !== cvId));
        this.deletingCvId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errors.getMessage(error, 'Failed to delete CV'));
        this.deletingCvId.set(null);
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
}
