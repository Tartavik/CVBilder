import { Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';
import { AppIconComponent } from '../../../shared/app-icon.component';
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

  readonly photo = computed(() => this.store.cv().personal.photo);
  readonly photoUploading = this.store.photoUploading;

  form = new FormGroup({
    fullName:  new FormControl('', Validators.required),
    jobTitle:  new FormControl('', Validators.required),
    email:     new FormControl('', [Validators.required, Validators.email]),
    phone:     new FormControl('', Validators.required),
    city:      new FormControl('', Validators.required),
    summary:   new FormControl('', Validators.required),
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
