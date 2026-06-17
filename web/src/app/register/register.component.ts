import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersApiService } from '../users-api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from '../shared/errors/error.service';

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
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly api = inject(UsersApiService);
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
    this.api.register(email, password).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err: HttpErrorResponse) => {
        this.error = this.errors.getMessage(err, 'Registration failed');
        this.loading = false;
      },
    });
  }
}
