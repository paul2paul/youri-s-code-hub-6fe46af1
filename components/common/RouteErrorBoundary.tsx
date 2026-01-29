import { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Wrapper component for route-level error handling.
 * Provides a full-page error fallback suitable for route errors.
 */
export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              Page introuvable ou erreur
            </h1>
            <p className="text-muted-foreground">
              La page que vous cherchez n'existe pas ou une erreur s'est produite.
            </p>
            <a
              href="/dashboard"
              className="inline-block text-primary hover:underline"
            >
              Retour au tableau de bord
            </a>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
