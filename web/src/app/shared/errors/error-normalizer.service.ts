import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppError, ErrorContext } from './app-error';

@Injectable({ providedIn: 'root' })
export class ErrorNormalizerService {
  normalize(error: unknown, context: ErrorContext = {}): AppError {
    const originalError = this.unwrap(error);
    if (originalError instanceof HttpErrorResponse) {
      return this.normalizeHttpError(originalError, context);
    }

    const message = this.getUnknownErrorMessage(
      originalError,
      context.fallback || 'An unexpected application error occurred.',
    );

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: context.source || 'runtime',
      title:
        context.source === 'application'
          ? 'Operation failed'
          : 'Unexpected application error',
      message,
      operation: context.operation,
      stack: originalError instanceof Error ? originalError.stack : undefined,
      originalError,
    };
  }

  private normalizeHttpError(
    error: HttpErrorResponse,
    context: ErrorContext,
  ): AppError {
    const unavailable = error.status === 0;
    const responseMessage = this.getResponseMessage(error.error);
    const fallback = context.fallback || 'The request could not be completed.';
    const message = unavailable
      ? 'Backend is unavailable. Check that the API is running and the Angular proxy is configured.'
      : `${responseMessage || fallback} (HTTP ${error.status})`;

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: 'http',
      title: unavailable
        ? 'Backend unavailable'
        : error.status >= 500
          ? 'Server error'
          : 'Request failed',
      message,
      operation: context.operation,
      method: context.method,
      url: error.url || context.url,
      status: error.status,
      statusText: unavailable
        ? 'Network error'
        : error.statusText || 'HTTP error',
      originalError: error,
    };
  }

  private getResponseMessage(response: unknown): string {
    if (typeof response === 'string') return response.trim();
    if (!response || typeof response !== 'object') return '';

    const message = (response as { message?: unknown }).message;
    if (Array.isArray(message)) {
      return message.filter((item) => typeof item === 'string').join(', ');
    }
    if (typeof message === 'string') return message;

    const responseError = (response as { error?: unknown }).error;
    return typeof responseError === 'string' ? responseError : '';
  }

  private getUnknownErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string' && error.trim()) return error.trim();
    if (error && typeof error === 'object') {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }
    return fallback;
  }

  private unwrap(error: unknown): unknown {
    if (!error || typeof error !== 'object') return error;

    const wrapped = error as {
      ngOriginalError?: unknown;
      rejection?: unknown;
      reason?: unknown;
    };
    return wrapped.ngOriginalError ?? wrapped.rejection ?? wrapped.reason ?? error;
  }
}
