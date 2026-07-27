import { Component, DestroyRef, OnInit, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AppIconComponent } from '../../../shared/app-icon.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { MonthPickerComponent } from '../../../shared/date-picker/month-picker.component';
import { FormTextFieldComponent } from '../../../shared/form-text-field/form-text-field.component';
import { FormTextareaFieldComponent } from '../../../shared/form-textarea-field/form-textarea-field.component';
import {
  ADDITIONAL_SECTION_OPTIONS,
  AdditionalSectionItem,
  AdditionalSectionType,
  getAdditionalItemLabel,
  getAdditionalSectionLabel,
} from '../../additional-sections';
import { CV_FIELD_LIMITS, CV_MIN_TEXT_LENGTH } from '../../cv-field-limits';
import { CvStore } from '../../cv.store';

@Component({
  selector: 'app-additional-sections-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    AppIconComponent,
    MonthPickerComponent,
    FormTextFieldComponent,
    FormTextareaFieldComponent,
  ],
  templateUrl: './additional-sections-section.component.html',
  styleUrl: './additional-sections-section.component.scss',
})
export class AdditionalSectionsSectionComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly showValidationErrors = effect(() => {
    if (this.store.validationAttempt() > 0) {
      queueMicrotask(() => {
        this.form.markAllAsTouched();
        this.form.updateValueAndValidity({ emitEvent: false });
      });
    }
  });

  readonly options = ADDITIONAL_SECTION_OPTIONS;
  readonly selectedType = new FormControl<AdditionalSectionType | null>(null);
  readonly form = new FormArray<FormGroup>([]);
  readonly languageLevels = [
    'Beginner',
    'Elementary (A1)',
    'Pre-intermediate (A2)',
    'Intermediate (B1)',
    'Upper-intermediate (B2)',
    'Advanced (C1)',
    'Proficient (C2)',
    'Native',
  ];

  get groups(): FormGroup[] {
    return this.form.controls as FormGroup[];
  }

  ngOnInit(): void {
    this.store.cv().additionalSections.forEach((item) => {
      this.form.push(this.createGroup(item), { emitEvent: false });
    });

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((values: AdditionalSectionFormValue[]) => {
        const ids = this.store.cv().additionalSections.map((item) => item.id);
        values.forEach((value, index) => {
          if (ids[index]) {
            this.store.updateAdditionalSection(
              ids[index],
              toAdditionalSectionPatch(value),
            );
          }
        });
      });
  }

  add(): void {
    const type = this.selectedType.value;
    if (!type) return;

    const item = this.store.addAdditionalSection(type);
    this.form.push(this.createGroup(item), { emitEvent: false });
    this.selectedType.reset(null);
    if (this.store.validationAttempt() > 0) {
      this.form.at(this.form.length - 1).markAllAsTouched();
    }
  }

  remove(index: number): void {
    const item = this.store.cv().additionalSections[index];
    if (!item) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        title: `Delete ${getAdditionalSectionLabel(item.type).toLowerCase()} entry?`,
        message: 'This entry will be removed from the current CV.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.store.removeAdditionalSection(item.id);
      this.form.removeAt(index, { emitEvent: false });
    });
  }

  typeAt(index: number): AdditionalSectionType {
    return this.store.cv().additionalSections[index]?.type ?? 'custom';
  }

  sectionLabel(type: AdditionalSectionType): string {
    return getAdditionalSectionLabel(type);
  }

  titleLabel(type: AdditionalSectionType): string {
    return getAdditionalItemLabel(type);
  }

  private createGroup(item: AdditionalSectionItem): FormGroup {
    return new FormGroup({
      type: new FormControl(item.type, { nonNullable: true }),
      sectionTitle: new FormControl(item.sectionTitle, {
        nonNullable: true,
        validators:
          item.type === 'custom'
            ? [
                Validators.required,
                Validators.minLength(CV_MIN_TEXT_LENGTH),
                Validators.maxLength(CV_FIELD_LIMITS.shortText),
              ]
            : [Validators.maxLength(CV_FIELD_LIMITS.shortText)],
      }),
      title: new FormControl(item.title, {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(CV_MIN_TEXT_LENGTH),
          Validators.maxLength(CV_FIELD_LIMITS.shortText),
        ],
      }),
      subtitle: new FormControl(item.subtitle, {
        nonNullable: true,
        validators: [Validators.maxLength(CV_FIELD_LIMITS.shortText)],
      }),
      description: new FormControl(item.description, {
        nonNullable: true,
        validators: [Validators.maxLength(CV_FIELD_LIMITS.longText)],
      }),
      startDate: new FormControl(toMonthDate(item.startDate)),
      endDate: new FormControl(toMonthDate(item.endDate)),
      url: new FormControl(item.url, {
        nonNullable: true,
        validators:
          item.type === 'link'
            ? [
                Validators.required,
                Validators.maxLength(CV_FIELD_LIMITS.url),
                httpUrlValidator,
              ]
            : [Validators.maxLength(CV_FIELD_LIMITS.url), httpUrlValidator],
      }),
      level: new FormControl(item.level, {
        nonNullable: true,
        validators:
          item.type === 'language'
            ? [
                Validators.required,
                Validators.maxLength(CV_FIELD_LIMITS.shortText),
              ]
            : [Validators.maxLength(CV_FIELD_LIMITS.shortText)],
      }),
      location: new FormControl(item.location, {
        nonNullable: true,
        validators: [Validators.maxLength(CV_FIELD_LIMITS.shortText)],
      }),
    });
  }
}

type AdditionalSectionFormValue = Omit<
  Partial<AdditionalSectionItem>,
  'startDate' | 'endDate'
> & {
  startDate?: unknown;
  endDate?: unknown;
};

function toAdditionalSectionPatch(
  value: AdditionalSectionFormValue,
): Partial<AdditionalSectionItem> {
  return {
    ...value,
    startDate: toMonthString(value.startDate),
    endDate: toMonthString(value.endDate),
  };
}

function toMonthDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function toMonthString(value: unknown): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function httpUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = `${control.value ?? ''}`.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol)
      ? null
      : { pattern: true };
  } catch {
    return { pattern: true };
  }
}
