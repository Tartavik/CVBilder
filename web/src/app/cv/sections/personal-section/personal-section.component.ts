import { Component, DestroyRef, OnInit, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';
import { AppIconComponent } from '../../../shared/app-icon.component';
import {
  PHONE_PATTERN,
  SHORT_TEXT_PATTERN,
  STRICT_EMAIL_PATTERN,
} from '../../../shared/validation-patterns';
import { CvStore } from '../../cv.store';

@Component({
  selector: 'app-personal-section',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, AppIconComponent],
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
    fullName:  new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(SHORT_TEXT_PATTERN),
    ]),
    jobTitle:  new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(SHORT_TEXT_PATTERN),
    ]),
    email:     new FormControl('', [
      Validators.required,
      Validators.pattern(STRICT_EMAIL_PATTERN),
    ]),
    phone:     new FormControl('', [
      Validators.required,
      Validators.pattern(PHONE_PATTERN),
    ]),
    city:      new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(SHORT_TEXT_PATTERN),
    ]),
    summary:   new FormControl('', [
      Validators.required,
      Validators.minLength(2),
    ]),
  });

  ngOnInit() {
    const personal = this.store.cv().personal;
    this.form.patchValue(personal, { emitEvent: false });
    this.form.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) =>
        this.store.updatePersonal({
          fullName:  v.fullName  ?? '',
          jobTitle:  v.jobTitle  ?? '',
          email:     v.email     ?? '',
          phone:     v.phone     ?? '',
          city:      v.city      ?? '',
          summary:   v.summary   ?? '',
          photo:     this.store.cv().personal.photo,
        })
      );
  }

  onPhotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.store.uploadProfilePhoto(file);
    (event.target as HTMLInputElement).value = '';
  }

  removePhoto() {
    this.store.deleteProfilePhoto();
  }
}
