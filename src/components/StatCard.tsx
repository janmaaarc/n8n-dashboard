import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TrendData {
  value: number;
  isPositiveGood?: boolean; // For errors, decrease is good
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
  color?: 'default' | 'success' | 'error' | 'warning';
  trend?: TrendData;
}

const colorClasses = {
  default: 'text-neutral-500 dark:text-neutral-400',
  success: 'text-emerald-600 dark:text-emerald-500',
  error: 'text-red-600 dark:text-red-500',
  warning: 'text-amber-600 dark:text-amber-500',
};

const iconBgClasses = {
  default: 'bg-neutral-100 dark:bg-neutral-800',
  success: 'bg-emerald-50 dark:bg-emerald-500/10',
  error: 'bg-red-50 dark:bg-red-500/10',
  warning: 'bg-amber-50 dark:bg-amber-500/10',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  suffix,
  icon: Icon,
  color = 'default',
  trend,
}) => {
  const displayValue = suffix === '%' ? value.toFixed(1) : value;

  const getTrendColor = () => {
    if (!trend || trend.value === 0) return 'text-neutral-400 dark:text-neutral-500';
    const isPositive = trend.value > 0;
    const isGood = trend.isPositiveGood !== false ? isPositive : !isPositive;
    return isGood
      ? 'text-emerald-600 dark:text-emerald-500'
      : 'text-red-600 dark:text-red-500';
  };

  const formatTrend = () => {
    if (!trend) return null;
    const prefix = trend.value > 0 ? '+' : '';
    return suffix === '%' ? `${prefix}${trend.value.toFixed(1)}%` : `${prefix}${trend.value}`;
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className={`p-2 rounded-md ${iconBgClasses[color]}`}>
        <Icon size={18} className={colorClasses[color]} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-semibold text-neutral-900 dark:text-white tabular-nums">
          {displayValue}{suffix}
        </p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {label}
          </p>
          {trend && trend.value !== 0 && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${getTrendColor()}`}>
              {trend.value > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {formatTrend()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
