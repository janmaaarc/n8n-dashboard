import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TrendData {
  value: number;
  isPositiveGood?: boolean;
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
  color?: 'default' | 'success' | 'error' | 'warning';
  trend?: TrendData;
  onClick?: () => void;
}

const dotColors = {
  default: 'bg-neutral-400',
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  suffix,
  icon: Icon,
  color = 'default',
  trend,
  onClick,
}) => {
  const displayValue = suffix === '%' ? value.toFixed(1) : value;

  const getTrendColor = () => {
    if (!trend || trend.value === 0) return 'text-neutral-400';
    const isPositive = trend.value > 0;
    const isGood = trend.isPositiveGood !== false ? isPositive : !isPositive;
    return isGood ? 'text-neutral-600 dark:text-neutral-300' : 'text-neutral-500';
  };

  const formatTrend = () => {
    if (!trend) return null;
    const prefix = trend.value > 0 ? '+' : '';
    return suffix === '%' ? `${prefix}${trend.value.toFixed(1)}%` : `${prefix}${trend.value}`;
  };

  const baseClasses = "p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-left w-full";
  const interactiveClasses = onClick ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors" : "";

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <Icon size={16} className="text-neutral-400" />
        {color !== 'default' && (
          <span className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
        )}
      </div>
      <p className="text-3xl font-semibold text-neutral-900 dark:text-white tabular-nums tracking-tight">
        {displayValue}{suffix}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
        {trend && trend.value !== 0 && (
          <span className={`flex items-center gap-0.5 text-xs ${getTrendColor()}`}>
            {trend.value > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {formatTrend()}
          </span>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} ${interactiveClasses}`}>
        {content}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
};
