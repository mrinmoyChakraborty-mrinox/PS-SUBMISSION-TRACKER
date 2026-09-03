import React from 'react';
import { getStatusColor } from '../utils/format';

interface ProgressBarProps {
  count: number;
  capacity: number;
  percentage: number;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ count, capacity, percentage, animated = true }) => {
  const color = getStatusColor(percentage);
  const isFull = percentage >= 100;

  return (
    <div className="w-full relative space-y-2">
      <div className="flex justify-between items-baseline text-sm font-bold text-slate-900 dark:text-white">
        <span className="text-sm sm:text-base">{count} / {capacity} Submissions Recorded</span>
        <span className="text-brand-500 font-extrabold text-base sm:text-lg">{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-4 bg-slate-200 dark:bg-navy-950 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800 p-0.5 relative shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}A0`
          }}
        />
      </div>
      {isFull && (
        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full transform rotate-12 font-black shadow-lg uppercase tracking-wider">
          FULL 100%
        </div>
      )}
    </div>
  );
};
