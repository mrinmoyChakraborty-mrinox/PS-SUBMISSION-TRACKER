import React, { useEffect, useState } from 'react';
import { ProblemStatement } from '../types';
import { formatRelativeTime } from '../utils/format';

interface StatsPanelProps {
  data: ProblemStatement;
  prevCount: number | null;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ data, prevCount }) => {
  const [animateCount, setAnimateCount] = useState(false);

  useEffect(() => {
    if (prevCount !== null && prevCount !== data.count) {
      setAnimateCount(true);
      const timer = setTimeout(() => setAnimateCount(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [data.count, prevCount]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
      <div className="glass p-4 rounded-xl flex flex-col justify-center">
        <span className="text-gray-400 text-sm mb-1">Current Count</span>
        <span className={`text-3xl font-bold ${animateCount ? 'animate-count-change text-blue-500' : 'text-white'}`}>
          {data.count}
        </span>
      </div>
      
      <div className="glass p-4 rounded-xl flex flex-col justify-center">
        <span className="text-gray-400 text-sm mb-1">Capacity</span>
        <span className="text-3xl font-bold text-gray-200">{data.capacity}</span>
      </div>
      
      <div className="glass p-4 rounded-xl flex flex-col justify-center">
        <span className="text-gray-400 text-sm mb-1">Remaining</span>
        <span className="text-3xl font-bold text-gray-200">{data.remaining}</span>
      </div>
      
      <div className="glass p-4 rounded-xl flex flex-col justify-center">
        <span className="text-gray-400 text-sm mb-1">Last Change</span>
        <span className="text-lg font-medium text-gray-200 break-words">
          {formatRelativeTime(data.lastCountChangeAt)}
        </span>
      </div>
    </div>
  );
};
