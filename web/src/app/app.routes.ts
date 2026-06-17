import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'cv/:cvId/edit',
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
    loadComponent: () =>
      import('./register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./users-list/users-list.component').then((m) => m.UsersListComponent),
  },
];
