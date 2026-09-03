import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePSData } from '../hooks/usePSData';
import { useTrackedPS } from '../hooks/useTrackedPS';
import { ProgressBar } from '../components/ProgressBar';
import { StatusIndicator } from '../components/StatusIndicator';
import { NotificationBell } from '../components/NotificationBell';
import { StatsPanel } from '../components/StatsPanel';
import { HistoryChart } from '../components/HistoryChart';

export const PSPage: React.FC = () => {
  const { psId } = useParams<{ psId: string }>();
  const id = psId?.toUpperCase() || '';
  
  const { data, loading, error, prevCount } = usePSData(id);
  const { isTracked, addPS } = useTrackedPS();

  useEffect(() => {
    if (id) {
      document.title = `${id} Submission Count — SIH 2026`;
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="glass p-8 rounded-2xl max-w-md w-full text-center space-y-4">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white">Not Found</h2>
          <p className="text-gray-400">{error || 'This problem statement could not be found.'}</p>
          <Link to="/" className="inline-block mt-4 bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-full font-medium transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-gray-400 hover:text-white flex items-center transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{data.psId}</h1>
          
          {!isTracked(id) && (
            <button 
              onClick={() => addPS(id)}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-md transition-colors"
            >
              + Add to Tracked
            </button>
          )}
        </div>
        
        <NotificationBell psId={id} />
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">{data.title}</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="bg-blue-900/50 text-blue-300 border border-blue-800 px-3 py-1 rounded-full">
              {data.category}
            </span>
            <span className="bg-indigo-900/50 text-indigo-300 border border-indigo-800 px-3 py-1 rounded-full">
              {data.theme}
            </span>
          </div>
        </div>

        <div className="glass p-6 sm:p-8 rounded-2xl relative overflow-hidden">
          {/* Subtle background glow based on fill percentage */}
          <div 
            className="absolute -inset-4 opacity-10 blur-2xl z-0 transition-opacity duration-1000"
            style={{ backgroundColor: data.percentage > 85 ? '#ef4444' : data.percentage > 60 ? '#f59e0b' : '#10b981' }}
          />
          
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-6">
              <div className="flex items-center space-x-4">
                <StatusIndicator status={data.status} lastFetchAt={data.lastSuccessfulFetchAt} />
              </div>
            </div>
            
            <ProgressBar count={data.count} capacity={data.capacity} percentage={data.percentage} />
          </div>
        </div>

        <StatsPanel data={data} prevCount={prevCount} />
        
        <HistoryChart psId={id} />
      </div>
    </div>
  );
};
