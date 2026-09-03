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
    <div className="w-full relative">
      <div className="flex justify-between text-sm mb-2 text-gray-300">
        <span>{count} / {capacity} Submissions</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700 relative">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}80`
          }}
        />
      </div>
      {isFull && (
        <div className="absolute -top-1 -right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-md transform rotate-12 font-bold shadow-lg">
          FULL
        </div>
      )}
    </div>
  );
};
