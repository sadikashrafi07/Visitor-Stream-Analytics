import { type ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  tooltip?: string;
  icon?: ReactNode;
  trend?: number;
  className?: string;
}

function formatTrend(value: number) {
  return `${Math.abs(value).toFixed(1)}%`;
}

export function KpiCard({
  title,
  value,
  subtitle,
  tooltip,
  icon,
  trend,
  className,
}: KpiCardProps) {
  const hasFooter = Boolean(subtitle) || trend !== undefined;

  return (
    <section
      className={cn('kpi-card animate-fade-in', className)}
      aria-label={title}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>

          {tooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-sm text-muted-foreground/60 transition-colors hover:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label={`More information about ${title}`}
                >
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        {icon ? (
          <div className="shrink-0 text-primary/70" aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </div>

      <div className="text-3xl font-bold tracking-tight text-foreground font-display animate-count-up">
        {value}
      </div>

      {hasFooter ? (
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {subtitle ? (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            ) : null}
          </div>

          {trend !== undefined ? (
            <div
              className={cn(
                'flex shrink-0 items-center gap-0.5 text-xs font-medium',
                trend > 0
                  ? 'text-success'
                  : trend < 0
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              )}
              aria-label={`Trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat'} ${formatTrend(trend)}`}
            >
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {formatTrend(trend)}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}