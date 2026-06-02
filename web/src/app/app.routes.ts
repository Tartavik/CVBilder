import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'register', pathMatch: 'full' },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./users-list/users-list.component').then((m) => m.UsersListComponent),
  },
];
