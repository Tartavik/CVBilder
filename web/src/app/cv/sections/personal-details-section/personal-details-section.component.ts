import { Component, DestroyRef, OnInit, effect, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PHONE_PATTERN,
  SHORT_TEXT_PATTERN,
  STRICT_EMAIL_PATTERN,
} from '../../../shared/validation-patterns';
import { FormTextFieldComponent } from '../../../shared/form-text-field/form-text-field.component';
import { FormTextareaFieldComponent } from '../../../shared/form-textarea-field/form-textarea-field.component';
import { PhoneFieldComponent } from '../../../shared/phone-field/phone-field.component';
import { CV_FIELD_LIMITS, CV_MIN_TEXT_LENGTH } from '../../cv-field-limits';
import { CvStore } from '../../cv.store';

@Component({
  selector: 'app-personal-details-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormTextFieldComponent,
    FormTextareaFieldComponent,
    PhoneFieldComponent,
  ],
  templateUrl: './personal-details-section.component.html',
})
export class PersonalDetailsSectionComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly showValidationErrors = effect(() => {
    if (this.store.validationAttempt() > 0) {
      queueMicrotask(() => {
        this.form.markAllAsTouched();
        this.form.updateValueAndValidity({ emitEvent: false });
      });
    }
  });

  readonly form = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.maxLength(CV_FIELD_LIMITS.email),
      Validators.pattern(STRICT_EMAIL_PATTERN),
    ]),
    phone: new FormControl('', [
      Validators.required,
      Validators.maxLength(CV_FIELD_LIMITS.phone),
      Validators.pattern(PHONE_PATTERN),
    ]),
    city: new FormControl('', [
      Validators.required,
      Validators.minLength(CV_MIN_TEXT_LENGTH),
      Validators.maxLength(CV_FIELD_LIMITS.shortText),
      Validators.pattern(SHORT_TEXT_PATTERN),
    ]),
    summary: new FormControl('', [
      Validators.required,
      Validators.minLength(CV_MIN_TEXT_LENGTH),
      Validators.maxLength(CV_FIELD_LIMITS.longText),
    ]),
  });

  ngOnInit() {
    const p = this.store.cv().personal;
    this.form.patchValue(
      { email: p.email, phone: p.phone, city: p.city, summary: p.summary },
      { emitEvent: false },
    );

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        const current = this.store.cv().personal;
        this.store.updatePersonal({
          ...current,
          email: v.email ?? '',
          phone: v.phone ?? '',
          city: v.city ?? '',
          summary: v.summary ?? '',
        });
      });
  }
}
