import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersApiService } from '../users-api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from '../shared/errors/error.service';
import { STRICT_EMAIL_PATTERN } from '../shared/validation-patterns';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

const matchesPassword: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.parent?.get('password')?.value;
  return !control.value || !password || control.value === password
    ? null
    : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly api = inject(UsersApiService);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorService);
  private readonly destroyRef = inject(DestroyRef);

  form = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(STRICT_EMAIL_PATTERN),
    ]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [
      Validators.required,
      matchesPassword,
    ]),
  });

  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.form.controls.confirmPassword.updateValueAndValidity({
          emitEvent: false,
        });
      });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const email = this.form.value.email ?? '';
    const password = this.form.value.password ?? '';
    this.api
      .register(email, password)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: () => this.router.navigate(['/login']),
        error: (err: HttpErrorResponse) => {
          this.error.set(this.errors.getMessage(err, 'Registration failed'));
        },
      });
  }
}
