import { Component, DestroyRef, OnInit, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormTextFieldComponent } from '../../../shared/form-text-field/form-text-field.component';
import { FormTextareaFieldComponent } from '../../../shared/form-textarea-field/form-textarea-field.component';
import { ProfilePhotoFieldComponent } from '../../../shared/profile-photo-field/profile-photo-field.component';
import { PhoneFieldComponent } from '../../../shared/phone-field/phone-field.component';
import {
  PHONE_PATTERN,
  SHORT_TEXT_PATTERN,
  STRICT_EMAIL_PATTERN,
} from '../../../shared/validation-patterns';
import { CV_FIELD_LIMITS, CV_MIN_TEXT_LENGTH } from '../../cv-field-limits';
import { CvStore } from '../../cv.store';

@Component({
  selector: 'app-personal-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormTextFieldComponent,
    FormTextareaFieldComponent,
    ProfilePhotoFieldComponent,
    PhoneFieldComponent,
  ],
  templateUrl: './personal-section.component.html',
})
export class PersonalSectionComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly photo = () => this.store.cv().personal.photo;
  readonly photoUploading = this.store.photoUploading;
  private readonly showValidationErrors = effect(() => {
    if (this.store.validationAttempt() > 0) {
      queueMicrotask(() => {
        this.form.markAllAsTouched();
        this.form.updateValueAndValidity({ emitEvent: false });
      });
    }
  });

  form = new FormGroup({
    fullName: new FormControl('', [
      Validators.required,
      Validators.minLength(CV_MIN_TEXT_LENGTH),
      Validators.maxLength(CV_FIELD_LIMITS.shortText),
      Validators.pattern(SHORT_TEXT_PATTERN),
    ]),
    jobTitle: new FormControl('', [
      Validators.required,
      Validators.minLength(CV_MIN_TEXT_LENGTH),
      Validators.maxLength(CV_FIELD_LIMITS.shortText),
      Validators.pattern(SHORT_TEXT_PATTERN),
    ]),
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
    const personal = this.store.cv().personal;
    this.form.patchValue(personal, { emitEvent: false });
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) =>
        this.store.updatePersonal({
          fullName: v.fullName ?? '',
          jobTitle: v.jobTitle ?? '',
          email: v.email ?? '',
          phone: v.phone ?? '',
          city: v.city ?? '',
          summary: v.summary ?? '',
          photo: this.store.cv().personal.photo,
        }),
      );
  }

  onPhotoUpload(file: File) {
    this.store.uploadProfilePhoto(file);
  }

  removePhoto() {
    this.store.deleteProfilePhoto();
  }
}
