/**
 * Global error logging utility.
 * Provides structured error logging with context.
 * Placeholder for future Sentry integration.
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  companyId?: string;
  [key: string]: unknown;
}

interface ErrorLogEntry {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  url: string;
  userAgent: string;
}

class ErrorLogger {
  private static instance: ErrorLogger;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with context.
   */
  log(error: Error | string, context: ErrorContext = {}): void {
    const entry: ErrorLogEntry = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorLogger]', entry);
    }

    // TODO: Send to Sentry or other error tracking service
    // Sentry.captureException(error, { extra: context });
  }

  /**
   * Log a warning.
   */
  warn(message: string, context: ErrorContext = {}): void {
    if (import.meta.env.DEV) {
      console.warn('[ErrorLogger:warn]', message, context);
    }
  }

  /**
   * Log an info message (for debugging).
   */
  info(message: string, context: ErrorContext = {}): void {
    if (import.meta.env.DEV) {
      console.info('[ErrorLogger:info]', message, context);
    }
  }
}

export const errorLogger = ErrorLogger.getInstance();

/**
 * Initialize global error handlers.
 * Call this once in main.tsx.
 */
export function initializeErrorHandlers(): void {
  // Handle uncaught errors
  window.onerror = (message, source, lineno, colno, error) => {
    errorLogger.log(error || String(message), {
      source: source || '',
      line: lineno,
      column: colno,
    });
    // Return false to allow default browser handling
    return false;
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    errorLogger.log(error, {
      type: 'unhandledrejection',
    });
  };
}
