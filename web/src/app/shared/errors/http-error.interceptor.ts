import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorService } from './error.service';

export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const errors = inject(ErrorService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
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
