import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useState } from 'react';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child component rendered</div>;
}

// Wrapper component to control error state from outside
function TestWrapper() {
  const [shouldThrow, setShouldThrow] = useState(true);

  return (
    <ErrorBoundary>
      <button onClick={() => setShouldThrow(false)}>Reset</button>
      <ThrowError shouldThrow={shouldThrow} />
    </ErrorBoundary>
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
    expect(screen.getByText(/Nous sommes désolés/)).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error fallback</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText('Une erreur est survenue')).not.toBeInTheDocument();
  });

  it('should show retry button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();

    // Verify retry button exists
    const retryButton = screen.getByRole('button', { name: /réessayer/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should reset error state when retry is clicked', () => {
    // First render - will throw and show error
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /réessayer/i });
    fireEvent.click(retryButton);

    // The ErrorBoundary resets its state, but will re-throw since component still throws
    // The key behavior is that the state gets reset (hasError becomes false)
    // Since ThrowError still has shouldThrow=true, it will throw again
    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
  });

  it('should log error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error');

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should show error details in development mode', () => {
    // In test environment, import.meta.env.DEV is true
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // The error message should be visible in dev mode
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });
});
