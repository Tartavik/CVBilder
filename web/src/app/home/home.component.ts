import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Store } from '@ngrx/store';
import { AppIconComponent } from '../shared/app-icon.component';
import { DatePickerComponent } from '../shared/date-picker/date-picker.component';
import {
  CvListQuery,
  CvSortBy,
  CvSortOrder,
  CvSummary,
  CvTemplate,
  UsersApiService,
} from '../users-api.service';
import { ErrorService } from '../shared/errors/error.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { TemplatePickerDialogComponent } from './template-picker-dialog/template-picker-dialog.component';
import { publicCvsActions } from './state/public-cvs.actions';
import { publicCvsFeature } from './state/public-cvs.reducer';

type CvSortValue = `${CvSortBy}:${CvSortOrder}`;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    AppIconComponent,
    DatePickerComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly api = inject(UsersApiService);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorService);
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);

  readonly myCvs = signal<CvSummary[]>([]);
  readonly myCvsLoading = signal(true);
  readonly deletingCvId = signal<string | null>(null);
  readonly error = signal('');
  readonly allCvs = this.store.selectSignal(publicCvsFeature.selectItems);
  readonly publicCvQuery = this.store.selectSignal(
    publicCvsFeature.selectQuery,
  );
  readonly publicCvsLoading = this.store.selectSignal(
    publicCvsFeature.selectLoading,
  );
  readonly publicCvsError = this.store.selectSignal(
    publicCvsFeature.selectError,
  );
  readonly availableSkills = this.store.selectSignal(
    publicCvsFeature.selectAvailableSkills,
  );
  readonly filterOptionsLoading = this.store.selectSignal(
    publicCvsFeature.selectFilterOptionsLoading,
  );
  readonly totalItems = this.store.selectSignal(
    publicCvsFeature.selectTotalItems,
  );
  readonly totalPages = this.store.selectSignal(
    publicCvsFeature.selectTotalPages,
  );
  readonly hasActiveFilters = computed(() => {
    const query = this.publicCvQuery();
    return Boolean(
      query.author ||
        query.query ||
        query.createdFrom ||
        query.createdTo ||
        query.skills.length,
    );
  });
  readonly filtersForm = new FormGroup(
    {
      query: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(300), maxWordsValidator(10)],
      }),
      author: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(120)],
      }),
      createdFrom: new FormControl<Date | null>(null),
      createdTo: new FormControl<Date | null>(null),
      skills: new FormControl<string[]>([], { nonNullable: true }),
    },
    { validators: [createdDateRangeValidator] },
  );
  readonly sortControl = new FormControl<CvSortValue>('createdAt:desc', {
    nonNullable: true,
  });

  ngOnInit(): void {
    this.api.getUserCvs().subscribe({
      next: (cvs) => {
        this.myCvs.set(cvs);
        this.myCvsLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errors.getMessage(error, 'Failed to load CVs'));
        this.myCvsLoading.set(false);
      },
    });
    this.store.dispatch(publicCvsActions.initialize());
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
    this.deletingCvId.set(cvId);
    this.error.set('');

    this.api.deleteCv(cvId).subscribe({
      next: () => {
        this.myCvs.update((cvs) => cvs.filter((cv) => cv.id !== cvId));
        this.deletingCvId.set(null);
        this.store.dispatch(publicCvsActions.refreshRequested());
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errors.getMessage(error, 'Failed to delete CV'));
        this.deletingCvId.set(null);
      },
    });
  }

  applyFilters(): void {
    if (this.filtersForm.invalid) {
      this.filtersForm.markAllAsTouched();
      return;
    }

    const values = this.filtersForm.getRawValue();
    const changes: Partial<CvListQuery> = {
      query: values.query.trim(),
      author: values.author.trim(),
      createdFrom: toIsoDate(values.createdFrom),
      createdTo: toIsoDate(values.createdTo),
      skills: values.skills,
    };
    this.store.dispatch(publicCvsActions.queryChanged({ changes }));
  }

  clearFilters(): void {
    this.filtersForm.reset({
      query: '',
      author: '',
      createdFrom: null,
      createdTo: null,
      skills: [],
    });
    this.applyFilters();
  }

  changeSort(value: CvSortValue): void {
    const [sortBy, sortOrder] = value.split(':') as [CvSortBy, CvSortOrder];
    this.store.dispatch(
      publicCvsActions.queryChanged({
        changes: { sortBy, sortOrder },
      }),
    );
  }

  changePage(page: number): void {
    this.store.dispatch(publicCvsActions.queryChanged({ changes: { page } }));
  }
}

function createdDateRangeValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const createdFrom = control.get('createdFrom')?.value as
    | Date
    | null
    | undefined;
  const createdTo = control.get('createdTo')?.value as Date | null | undefined;
  return createdFrom instanceof Date &&
    createdTo instanceof Date &&
    createdFrom.getTime() > createdTo.getTime()
    ? { createdDateRange: true }
    : null;
}

function toIsoDate(value: Date | null): string | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function maxWordsValidator(maxWords: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    const wordCount = value ? value.split(/\s+/u).length : 0;
    return wordCount > maxWords ? { maxWords: { maxWords } } : null;
  };
}
