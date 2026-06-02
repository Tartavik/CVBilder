import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { User, UsersApiService } from '../users-api.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal(true);

  private readonly api = inject(UsersApiService);

  ngOnInit() {
    this.api.getAll().subscribe({
      next: (users) => { this.users.set(users); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
}
