import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  contentClassName?: string;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  className,
  action,
  contentClassName,
}: ChartContainerProps) {
  return (
    <section
      className={cn('chart-card animate-fade-in', className)}
      aria-label={title}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={cn('min-w-0', contentClassName)}>{children}</div>
    </section>
  );
}

interface EmptyStateProps {
  message?: string;
  className?: string;
  icon?: ReactNode;
}

export function EmptyState({
  message = 'No data available yet',
  className,
  icon,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center text-muted-foreground',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon ?? <span className="text-lg" aria-hidden="true">📊</span>}
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

interface LoadingStateProps {
  className?: string;
  label?: string;
}

export function LoadingState({
  className,
  label = 'Loading analytics data',
}: LoadingStateProps) {
  return (
    <div
      className={cn('flex items-center justify-center py-12', className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-primary animate-pulse-soft"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  className?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message,
  className,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <p className="text-sm font-medium text-destructive">Error loading data</p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">{message}</p>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}