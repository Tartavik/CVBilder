import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { AppIconComponent } from '../shared/app-icon.component';
import { User, UsersApiService } from '../users-api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from '../shared/errors/error.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    MatTableModule,
    MatChipsModule,
    MatButtonModule,
    AppIconComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal(true);
  error = signal('');
  readonly displayedColumns = ['email', 'role', 'created'];

  private readonly api = inject(UsersApiService);
  private readonly errors = inject(ErrorService);

  ngOnInit() {
    this.api.getAll().subscribe({
      next: (users) => { this.users.set(users); this.loading.set(false); },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errors.getMessage(error, 'Failed to load users'));
        this.loading.set(false);
      },
    });
  }
}
