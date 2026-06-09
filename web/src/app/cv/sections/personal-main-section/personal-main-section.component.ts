import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';
import { CvStore } from '../../cv.store';

@Component({
  selector: 'app-personal-main-section',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './personal-main-section.component.html',
})
export class PersonalMainSectionComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly photo = signal<string>('');

  readonly form = new FormGroup({
    fullName: new FormControl(''),
    jobTitle: new FormControl(''),
    summary:  new FormControl(''),
  });

  ngOnInit() {
    const p = this.store.cv().personal;
    this.form.patchValue({ fullName: p.fullName, jobTitle: p.jobTitle, summary: p.summary }, { emitEvent: false });
    this.photo.set(p.photo ?? '');

    this.form.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        const current = this.store.cv().personal;
        this.store.updatePersonal({
          ...current,
          fullName: v.fullName ?? '',
          jobTitle: v.jobTitle ?? '',
          summary:  v.summary  ?? '',
          photo: this.photo(),
        });
      });
  }

  onPhotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.photo.set(dataUrl);
      this.store.updatePersonal({ ...this.store.cv().personal, photo: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  removePhoto() {
    this.photo.set('');
    this.store.updatePersonal({ ...this.store.cv().personal, photo: '' });
  }
}
