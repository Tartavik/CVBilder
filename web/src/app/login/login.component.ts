import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ErrorStateMatcher } from '@angular/material/core';
import { UsersApiService } from '../users-api.service';
import { AuthService } from '../auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from '../shared/errors/error.service';
import { STRICT_EMAIL_PATTERN } from '../shared/validation-patterns';
import { TimeoutError, finalize, timeout } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly api = inject(UsersApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorService);

  form = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(STRICT_EMAIL_PATTERN),
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
    ]),
  });

  readonly loading = signal(false);
  readonly error = signal('');
  readonly invalidCredentials = signal(false);
  readonly loginErrorStateMatcher: ErrorStateMatcher = {
    isErrorState: (control, form) =>
      this.invalidCredentials() ||
      !!(control?.invalid && (control.touched || form?.submitted)),
  };
  private errorTimer: ReturnType<typeof setTimeout> | null = null;

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.clearError();
    const email = this.form.value.email ?? '';
    const password = this.form.value.password ?? '';
    this.api
      .login(email, password)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: ({ user, accessToken }) => {
          this.auth.setSession(user.id, accessToken);
          this.router.navigate(['/home']);
        },
        error: (err: unknown) => {
          if (err instanceof TimeoutError) {
            this.showError('Login took too long. Please try again.');
            return;
          }
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.invalidCredentials.set(true);
            this.showError('Invalid email or password');
            return;
          }
          this.showError(this.errors.getMessage(err, 'Could not log in'));
        },
      });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  clearInvalidCredentials(): void {
    if (!this.invalidCredentials()) return;
    this.invalidCredentials.set(false);
    this.clearError();
  }

  private showError(message: string): void {
    this.clearError();
    this.error.set(message);
    this.errorTimer = setTimeout(() => {
      this.error.set('');
      this.errorTimer = null;
    }, 2000);
  }

  private clearError(): void {
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
      this.errorTimer = null;
    }
    this.error.set('');
  }
}
