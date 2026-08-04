import { Route } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { adminGuard, authGuard, guestGuard } from './auth.guard';
import { PublicCvsEffects } from './home/state/public-cvs.effects';
import { publicCvsFeature } from './home/state/public-cvs.reducer';
import { pendingChangesGuard } from './cv/cv-editor/pending-changes.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./landing/landing.component').then((m) => m.LandingComponent),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },
      {
        path: 'home',
        canActivate: [authGuard],
        providers: [
          provideState(publicCvsFeature),
          provideEffects(PublicCvsEffects),
        ],
        loadComponent: () =>
          import('./home/home.component').then((m) => m.HomeComponent),
      },
    ],
  },
  {
    path: 'cv/:cvId/edit',
    canActivate: [authGuard],
    canDeactivate: [pendingChangesGuard],
    loadComponent: () =>
      import('./cv/cv-editor/cv-editor.component').then(
        (m) => m.CvEditorComponent,
      ),
  },
  {
    path: 'public/cv/:cvId',
    loadComponent: () =>
      import('./cv/public-cv/public-cv.component').then(
        (m) => m.PublicCvComponent,
      ),
  },
  {
    path: 'users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./users-list/users-list.component').then(
        (m) => m.UsersListComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
