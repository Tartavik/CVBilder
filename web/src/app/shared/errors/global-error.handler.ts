import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorService } from './error.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly errors = inject(ErrorService);

  handleError(error: unknown): void {
    this.errors.report(error, {
      source: 'runtime',
      fallback: 'An unexpected application error occurred.',
      notify: true,
    });
  }
}
