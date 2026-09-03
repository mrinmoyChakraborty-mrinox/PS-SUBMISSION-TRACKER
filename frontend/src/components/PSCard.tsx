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
    <div className="glass p-5 rounded-xl hover:bg-gray-800/80 transition-all duration-300 transform hover:-translate-y-1 relative group">
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-500 hover:bg-gray-700/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Remove from tracking"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      )}

      <Link to={`/ps/${psId}`} className="block h-full cursor-pointer">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-lg font-bold text-white">{psId}</h4>
          {!loading && !error && data && (
            <div className={`w-2 h-2 rounded-full mt-1.5 ${data.status === 'live' ? 'bg-green-500 animate-pulse-glow' : 'bg-gray-500'}`} />
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3 mt-4">
            <div className="h-2 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm mt-4">{error}</div>
        ) : data ? (
          <div className="mt-3">
            <p className="text-xs text-gray-400 truncate mb-3">{data.title}</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{data.count}</span>
              <span className="text-xs text-gray-400 mb-1">/ {data.capacity}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(data.percentage, 100)}%`, backgroundColor: getStatusColor(data.percentage) }}
              />
            </div>
          </div>
        ) : null}
      </Link>
    </div>
  );
};
