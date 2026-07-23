import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  readonly loading = signal(false);
  readonly error = signal('');

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
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
        next: (user) => {
          this.auth.setCurrentUser(user.id);
          this.router.navigate(['/home']);
        },
        error: (err: unknown) => {
          if (err instanceof TimeoutError) {
            this.error.set('Login took too long. Please try again.');
            return;
          }
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.error.set('Invalid email or password');
            return;
          }
          this.error.set(this.errors.getMessage(err, 'Could not log in'));
        },
      });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
