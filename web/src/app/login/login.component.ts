import { Component, inject } from '@angular/core';
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
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  loading = false;
  error = '';

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const email = this.form.value.email ?? '';
    const password = this.form.value.password ?? '';
    this.api.login(email, password).subscribe({
      next: (user) => {
        this.auth.setCurrentUser(user.id);
        this.router.navigate(['/home']);
      },
      error: (err: HttpErrorResponse) => {
        this.error = this.errors.getMessage(err, 'Invalid email or password');
        this.loading = false;
      },
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
