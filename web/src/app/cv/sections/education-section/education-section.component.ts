import { Component, DestroyRef, OnInit, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime } from 'rxjs';
import { AppIconComponent } from '../../../shared/app-icon.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { FormTextFieldComponent } from '../../../shared/form-text-field/form-text-field.component';
import { SHORT_TEXT_PATTERN } from '../../../shared/validation-patterns';
import {
  CV_FIELD_LIMITS,
  CV_MIN_TEXT_LENGTH,
} from '../../cv-field-limits';
import { CvStore, EducationItem } from '../../cv.store';

@Component({
  selector: 'app-education-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    AppIconComponent,
    FormTextFieldComponent,
  ],
  templateUrl: './education-section.component.html',
})
export class EducationSectionComponent implements OnInit {
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

  readonly form = new FormArray<FormGroup>([]);
  readonly reusableEducation = computed(() => this.store.reusableEducation());
  readonly reusableSelection = new FormControl<string | null>(null);

  get groups(): FormGroup[] {
    return this.form.controls as FormGroup[];
  }

  ngOnInit() {
    this.store.cv().education.forEach((item) =>
      this.form.push(this.createGroup(item), { emitEvent: false })
    );

    this.form.valueChanges
      .pipe(debounceTime(300),
      takeUntilDestroyed(this.destroyRef))
      .subscribe((values: Partial<EducationItem>[]) => {
        const ids = this.store.cv().education.map((e) => e.id);
        values.forEach((v, i) => {
          if (ids[i]) this.store.updateEducation(ids[i], v);
        });
      });
  }

  private createGroup(item?: Partial<EducationItem>): FormGroup {
    return new FormGroup({
      institution: new FormControl(item?.institution ?? '', [
        Validators.required,
        Validators.minLength(CV_MIN_TEXT_LENGTH),
        Validators.maxLength(CV_FIELD_LIMITS.shortText),
        Validators.pattern(SHORT_TEXT_PATTERN),
      ]),
      degree:      new FormControl(item?.degree      ?? '', [
        Validators.required,
        Validators.minLength(CV_MIN_TEXT_LENGTH),
        Validators.maxLength(CV_FIELD_LIMITS.shortText),
        Validators.pattern(SHORT_TEXT_PATTERN),
      ]),
      field:       new FormControl(item?.field       ?? '', [
        Validators.required,
        Validators.minLength(CV_MIN_TEXT_LENGTH),
        Validators.maxLength(CV_FIELD_LIMITS.shortText),
        Validators.pattern(SHORT_TEXT_PATTERN),
      ]),
      year:        new FormControl(item?.year        ?? '', [
        Validators.required,
        Validators.maxLength(4),
        Validators.pattern(/^\d{4}$/),
      ]),
    });
  }

  add() {
    this.appendEducation();
  }

  addReusableEducation(id: string | null): void {
    const source = this.reusableEducation().find((item) => item.id === id);
    if (!source) return;
    this.appendEducation(source);
    this.reusableSelection.reset(null, { emitEvent: false });
  }

  private appendEducation(source?: Partial<EducationItem>): void {
    this.store.addEducation(source);
    const items = this.store.cv().education;
    const newItem = items[items.length - 1];
    this.form.push(this.createGroup(newItem), { emitEvent: false });
    if (this.store.validationAttempt() > 0) {
      this.form.at(this.form.length - 1).markAllAsTouched();
    }
  }

  remove(index: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        title: 'Delete education?',
        message:
          'Are you sure you want to delete this education section? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      const id = this.store.cv().education[index]?.id;
      if (!id) return;
      this.store.removeEducation(id);
      this.form.removeAt(index, { emitEvent: false });
    });
  }
}
