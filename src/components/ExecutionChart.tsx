import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import type { Execution } from '../types';

interface ExecutionChartProps {
  executions: Execution[];
  isLoading?: boolean;
}

export const ExecutionChart: React.FC<ExecutionChartProps> = ({ executions, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-40 animate-pulse">
        <div className="h-full flex items-end gap-1 px-6">
          {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between px-6 mt-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="w-8 h-3 bg-neutral-200 dark:bg-neutral-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const chartData = useMemo(() => {
    const days = 7;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dayExecutions = executions.filter((e) =>
        isSameDay(new Date(e.startedAt), date)
      );
      const success = dayExecutions.filter((e) => e.status === 'success').length;
      const error = dayExecutions.filter((e) => e.status === 'error').length;

      data.push({
        date: format(date, 'MMM d'),
        success,
        error,
        total: success + error,
      });
    }

    return data;
  }, [executions]);

  const hasData = chartData.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
        No execution data for the past 7 days
      </div>
    );
  }

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#a3a3a3' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#a3a3a3' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#171717',
              border: '1px solid #404040',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#fafafa',
            }}
            labelStyle={{ color: '#a3a3a3' }}
          />
          <Area
            type="monotone"
            dataKey="success"
            stroke="#525252"
            strokeWidth={1.5}
            fill="#e5e5e5"
            fillOpacity={0.5}
            name="Success"
          />
          <Area
            type="monotone"
            dataKey="error"
            stroke="#a3a3a3"
            strokeWidth={1.5}
            fill="#f5f5f5"
            fillOpacity={0.3}
            name="Errors"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
