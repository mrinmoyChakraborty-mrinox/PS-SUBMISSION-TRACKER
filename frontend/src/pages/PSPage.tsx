import React, { useEffect, useState } from 'react';
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
  const [showFullDesc, setShowFullDesc] = useState(false);
  
  const { data, loading, isInitializing, error, prevCount } = usePSData(id);
  const { isTracked, addPS } = useTrackedPS();

  useEffect(() => {
    if (id && data) {
      document.title = `${id} — ${data.title.substring(0, 45)}... | SIH 2026 Submission Tracker`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          'content',
          `Track live submission counts for Smart India Hackathon 2026 Problem Statement ${id} (${data.title}). Current submissions: ${data.count}/${data.capacity} (${data.percentage}% filled).`
        );
      }
    } else if (id) {
      document.title = `${id} Submission Count — SIH 2026 Live Tracker`;
    }
  }, [id, data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="glass p-8 sm:p-10 rounded-2xl max-w-lg w-full text-center space-y-6 border border-blue-500/30 shadow-2xl">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
            <div className="absolute inset-2 bg-indigo-500/30 rounded-full animate-pulse" />
            <div className="relative z-10 w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/50">
              ⚡
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Initializing Tracker for {id}</h2>
            <p className="text-gray-300 text-sm">
              Connecting to official Smart India Hackathon 2026 live data stream...
            </p>
          </div>

          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 h-full w-3/4 animate-pulse" />
          </div>

          <div className="flex items-center justify-center text-xs text-blue-400 space-x-2 pt-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>Fetching live submission count — updates automatically in seconds</span>
          </div>

          <div className="pt-2">
            <Link to="/" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
              ← Return to Dashboard
            </Link>
          </div>
        </div>
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
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 leading-snug">{data.title}</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="bg-blue-900/50 text-blue-300 border border-blue-800 px-3 py-1 rounded-full text-xs font-medium">
              Category: {data.category}
            </span>
            <span className="bg-indigo-900/50 text-indigo-300 border border-indigo-800 px-3 py-1 rounded-full text-xs font-medium">
              Theme: {data.theme}
            </span>
          </div>
        </div>

        {/* Live Status & Progress Bar */}
        <div className="glass p-6 sm:p-8 rounded-2xl relative overflow-hidden">
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

        {/* Problem Statement Description Card */}
        {data.description && (
          <div className="glass p-6 sm:p-8 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Problem Statement Details & Description
              </h3>
              <button 
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {showFullDesc ? 'Show Less ▲' : 'Expand Details ▼'}
              </button>
            </div>
            
            <div className={`text-gray-300 text-sm leading-relaxed whitespace-pre-line font-sans ${!showFullDesc ? 'line-clamp-4' : ''}`}>
              {data.description}
            </div>
          </div>
        )}

        <StatsPanel data={data} prevCount={prevCount} />
        
        <HistoryChart psId={id} />
      </div>
    </div>
  );
};
