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

export function KpiCard({ title, value, subtitle, tooltip, icon, trend, className }: KpiCardProps) {
  return (
    <div className={cn('kpi-card animate-fade-in', className)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground/60" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {icon && <div className="text-primary/70">{icon}</div>}
      </div>
      <div className="text-3xl font-display font-bold tracking-tight text-foreground animate-count-up">
        {value}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-0.5 text-xs font-medium',
            trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
