export type AppErrorSource = 'http' | 'runtime' | 'application';

export interface AppError {
  id: string;
  timestamp: string;
  source: AppErrorSource;
  title: string;
  message: string;
  operation?: string;
  method?: string;
  url?: string;
  status?: number;
  statusText?: string;
  stack?: string;
  originalError: unknown;
}

export interface ErrorContext {
  source?: AppErrorSource;
  fallback?: string;
  operation?: string;
  method?: string;
  url?: string;
  notify?: boolean;
}
