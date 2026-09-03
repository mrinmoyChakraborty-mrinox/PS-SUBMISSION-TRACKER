import React from 'react';
import { Link } from 'react-router-dom';
import { usePSData } from '../hooks/usePSData';
import { getStatusColor } from '../utils/format';

interface PSCardProps {
  psId: string;
  onRemove?: () => void;
}

export const PSCard: React.FC<PSCardProps> = ({ psId, onRemove }) => {
  const { data, loading, error } = usePSData(psId);

  return (
    <div className="glass-card p-5 rounded-2xl relative group">
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
          title="Remove from tracking"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      )}

      <Link to={`/ps/${psId}`} className="block h-full cursor-pointer">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded-md object-contain" />
            <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{psId}</h4>
          </div>
          {!loading && !error && data && (
            <div className={`w-2.5 h-2.5 rounded-full ${data.status === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3 mt-4">
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-xs font-semibold mt-4">{error}</div>
        ) : data ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{data.title}</p>
            
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{data.count}</span>
                <span className="text-xs font-medium text-slate-400">/ {data.capacity} submissions</span>
              </div>
              <span className="text-xs font-bold text-brand-500">{data.percentage.toFixed(1)}%</span>
            </div>

            <div className="w-full h-2 bg-slate-100 dark:bg-navy-950 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-800">
              <div 
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(data.percentage, 100)}%`, backgroundColor: getStatusColor(data.percentage) }}
              />
            </div>
          </div>
        ) : null}
      </Link>
    </div>
  );
};
