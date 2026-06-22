import { Route } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'cv/:cvId/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./cv/cv-editor/cv-editor.component').then((m) => m.CvEditorComponent),
  },
  {
    path: 'public/cv/:cvId',
    loadComponent: () =>
      import('./cv/public-cv/public-cv.component').then((m) => m.PublicCvComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./users-list/users-list.component').then((m) => m.UsersListComponent),
  },
];
