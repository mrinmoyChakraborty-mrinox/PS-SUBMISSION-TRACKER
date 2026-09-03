import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePSData } from '../hooks/usePSData';
import { useTrackedPS } from '../hooks/useTrackedPS';
import { ProgressBar } from '../components/ProgressBar';
import { StatusIndicator } from '../components/StatusIndicator';
import { NotificationBell } from '../components/NotificationBell';
import { StatsPanel } from '../components/StatsPanel';
import { HistoryChart } from '../components/HistoryChart';
import { NodeStatusBadge } from '../components/NodeStatusBadge';

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="glass p-8 sm:p-10 rounded-3xl max-w-lg w-full text-center space-y-6 border border-brand-500/30 shadow-2xl">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />
            <div className="relative z-10 w-16 h-16 bg-white dark:bg-navy-900 rounded-2xl p-2 shadow-lg border border-orange-500/40">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Initializing Tracker for {id}</h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              Connecting to official Smart India Hackathon 2026 live data stream...
            </p>
          </div>

          <div className="w-full bg-slate-200 dark:bg-navy-900 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full w-3/4 animate-pulse" />
          </div>

          <div className="flex items-center justify-center text-xs text-brand-600 dark:text-brand-400 font-semibold space-x-2 pt-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            <span>Fetching live submission count — updates automatically in seconds</span>
          </div>

          <div className="pt-2">
            <Link to="/" className="text-xs text-slate-500 hover:text-brand-500 transition-colors">
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
        <div className="glass p-8 rounded-3xl max-w-md w-full text-center space-y-4">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">{error || 'This problem statement could not be found.'}</p>
          <Link to="/" className="inline-block mt-4 orange-gradient-bg px-6 py-2.5 rounded-full font-bold text-sm transition-all">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-20 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-slate-500 dark:text-slate-400 hover:text-brand-500 flex items-center transition-colors text-sm font-semibold">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back
          </Link>
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white dark:bg-navy-900 p-0.5 border border-slate-200 dark:border-slate-800" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{data.psId}</h1>
          </div>
          
          {!isTracked(id) && (
            <button 
              onClick={() => addPS(id)}
              className="text-xs font-bold bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-300 hover:bg-brand-500 hover:text-white px-3 py-1.5 rounded-full transition-colors"
            >
              + Track Statement
            </button>
          )}
        </div>
        
        <NotificationBell psId={id} />
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 leading-snug">{data.title}</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full font-semibold">
              Category: {data.category}
            </span>
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-semibold">
              Theme: {data.theme}
            </span>
          </div>
        </div>

        {/* Live Status & Progress Bar Card */}
        <div className="glass p-6 sm:p-8 rounded-3xl relative overflow-hidden">
          <div 
            className="absolute -inset-4 opacity-15 blur-3xl z-0 transition-opacity duration-1000"
            style={{ backgroundColor: data.percentage > 85 ? '#ef4444' : data.percentage > 60 ? '#ff6b00' : '#10b981' }}
          />
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center">
              <StatusIndicator status={data.status} lastFetchAt={data.lastSuccessfulFetchAt} />
              <span className="text-xs font-bold text-brand-500 uppercase tracking-widest bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
                Official Live Feed
              </span>
            </div>
            
            <ProgressBar count={data.count} capacity={data.capacity} percentage={data.percentage} />
          </div>
        </div>

        {/* Problem Statement Description Card */}
        {data.description && (
          <div className="glass p-6 sm:p-8 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Problem Statement Details & Specification
              </h3>
              <button 
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors"
              >
                {showFullDesc ? 'Show Less ▲' : 'Expand Details ▼'}
              </button>
            </div>
            
            <div className={`text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans ${!showFullDesc ? 'line-clamp-5' : ''}`}>
              {data.description}
            </div>
          </div>
        )}

        {/* Collector Node Status */}
        <NodeStatusBadge />

        <StatsPanel data={data} prevCount={prevCount} />
        
        <HistoryChart psId={id} />
      </div>
    </div>
  );
};
