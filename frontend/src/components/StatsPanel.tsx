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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      <div className="glass-card p-5 rounded-2xl flex flex-col justify-center border-l-4 border-l-brand-500">
        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Current Count</span>
        <span className={`text-3xl font-black ${animateCount ? 'animate-count-change text-brand-500' : 'text-slate-900 dark:text-white'}`}>
          {data.count}
        </span>
      </div>
      
      <div className="glass-card p-5 rounded-2xl flex flex-col justify-center">
        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Capacity</span>
        <span className="text-3xl font-black text-slate-900 dark:text-white">{data.capacity}</span>
      </div>
      
      <div className="glass-card p-5 rounded-2xl flex flex-col justify-center">
        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Slots Remaining</span>
        <span className="text-3xl font-black text-slate-900 dark:text-white">{data.remaining}</span>
      </div>
      
      <div className="glass-card p-5 rounded-2xl flex flex-col justify-center">
        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Last Count Change</span>
        <span className="text-base font-bold text-slate-800 dark:text-slate-200 break-words">
          {formatRelativeTime(data.lastCountChangeAt)}
        </span>
      </div>
    </div>
  );
};
