import { Component, DestroyRef, OnInit, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { FormTextFieldComponent } from '../../../shared/form-text-field/form-text-field.component';
import { FormTextareaFieldComponent } from '../../../shared/form-textarea-field/form-textarea-field.component';
import { ProfilePhotoFieldComponent } from '../../../shared/profile-photo-field/profile-photo-field.component';
import { SHORT_TEXT_PATTERN } from '../../../shared/validation-patterns';
import { CvStore } from '../../cv.store';

@Component({
  selector: 'app-personal-main-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormTextFieldComponent,
    FormTextareaFieldComponent,
    ProfilePhotoFieldComponent,
  ],
  templateUrl: './personal-main-section.component.html',
})
export class PersonalMainSectionComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly photo = computed(() => this.store.cv().personal.photo);
  readonly photoUploading = this.store.photoUploading;
  private readonly showValidationErrors = effect(() => {
    if (this.store.validationAttempt() > 0) {
      queueMicrotask(() => {
        this.form.markAllAsTouched();
        this.form.updateValueAndValidity({ emitEvent: false });
      });
    }
  });

  readonly form = new FormGroup({
    fullName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(SHORT_TEXT_PATTERN),
    ]),
    jobTitle: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(SHORT_TEXT_PATTERN),
    ]),
    summary:  new FormControl('', [
      Validators.required,
      Validators.minLength(2),
    ]),
  });

  ngOnInit() {
    const p = this.store.cv().personal;
    this.form.patchValue({ fullName: p.fullName, jobTitle: p.jobTitle, summary: p.summary }, { emitEvent: false });
    this.form.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        const current = this.store.cv().personal;
        this.store.updatePersonal({
          ...current,
          fullName: v.fullName ?? '',
          jobTitle: v.jobTitle ?? '',
          summary:  v.summary  ?? '',
          photo: current.photo,
        });
      });
  }

  onPhotoUpload(file: File) {
    this.store.uploadProfilePhoto(file);
  }

  removePhoto() {
    this.store.deleteProfilePhoto();
  }
}
