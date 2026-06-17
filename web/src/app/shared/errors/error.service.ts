import { Injectable, inject, signal } from '@angular/core';
import { AppError, ErrorContext } from './app-error';
import { ErrorNormalizerService } from './error-normalizer.service';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  private readonly normalizer = inject(ErrorNormalizerService);
  private readonly handledErrors = new WeakSet<object>();
  readonly latest = signal<AppError | null>(null);

  report(error: unknown, context: ErrorContext = {}): AppError {
    const normalized = this.normalizer.normalize(error, context);
    const reference = normalized.originalError;

    if (
      reference !== null &&
      typeof reference === 'object' &&
      this.handledErrors.has(reference)
    ) {
      return normalized;
    }

    if (reference !== null && typeof reference === 'object') {
      this.handledErrors.add(reference);
    }

    console.error(normalized.title, {
      ...normalized,
      originalError: normalized.originalError,
    });

    if (context.notify !== false) {
      this.latest.set(normalized);
    }
    return normalized;
  }

  getMessage(error: unknown, fallback?: string): string {
    return this.normalizer.normalize(error, { fallback }).message;
  }

  clear(): void {
    this.latest.set(null);
  }
}
