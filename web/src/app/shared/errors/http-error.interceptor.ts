import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../auth.service';
import { ErrorService } from './error.service';

export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const errors = inject(ErrorService);
  const auth = inject(AuthService);
  const accessToken = auth.getAccessToken();
  const authenticatedRequest =
    accessToken && request.url.startsWith('/api/')
      ? request.clone({
          setHeaders: { Authorization: `Bearer ${accessToken}` },
        })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (
          error.status === 401 &&
          accessToken &&
          !request.url.endsWith('/auth/login')
        ) {
          auth.expireSession();
        }
        errors.report(error, {
          source: 'http',
          method: request.method,
          url: request.urlWithParams,
          operation: `${request.method} ${request.urlWithParams}`,
          notify: error.status === 0 || error.status >= 500,
        });
      }

      return throwError(() => error);
    }),
  );
};
