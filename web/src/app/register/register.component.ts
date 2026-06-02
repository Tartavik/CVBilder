import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersApiService } from '../users-api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly api = inject(UsersApiService);
  private readonly router = inject(Router);

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
      next: () => this.router.navigate(['/users']),
      error: (err) => {
        this.error = err.error?.message ?? 'Something went wrong';
        this.loading = false;
      },
    });
  }
}
