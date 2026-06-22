import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { CvStore } from '../../cv.store';

@Component({
  selector: 'app-personal-details-section',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './personal-details-section.component.html',
})
export class PersonalDetailsSectionComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', Validators.required),
    city: new FormControl('', Validators.required),
  });

  ngOnInit() {
    const p = this.store.cv().personal;
    this.form.patchValue({ email: p.email, phone: p.phone, city: p.city }, { emitEvent: false });

    this.form.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        const current = this.store.cv().personal;
        this.store.updatePersonal({
          ...current,
          email: v.email ?? '',
          phone: v.phone ?? '',
          city: v.city ?? '',
        });
      });
  }
}
