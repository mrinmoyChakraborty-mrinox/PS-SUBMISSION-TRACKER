import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PSCard } from '../components/PSCard';
import { useTrackedPS } from '../hooks/useTrackedPS';
import { validatePsId, normalizePsId } from '../utils/format';
import { NodeStatusBadge } from '../components/NodeStatusBadge';

export const HomePage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { tracked, addPS, removePS } = useTrackedPS();

  const featuredPsIds = ['SIH26001', 'SIH26042', 'SIH26171'];

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!searchInput.trim()) return;
    
    const id = normalizePsId(searchInput);
    
    if (!validatePsId(id)) {
      setError('Invalid PS ID format. Must be SIH26XXX (e.g. SIH26042)');
      return;
    }

    setLoading(true);
    try {
      addPS(id);
      navigate(`/ps/${id}`);
    } catch (err) {
      setError('Failed to track PS ID');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center overflow-hidden flex-shrink-0">
        
        {/* Ambient Orange & Saffron Background Glows */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/20 dark:bg-brand-500/15 rounded-full blur-[120px] animate-orange-glow" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-amber-500/15 rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 animate-slide-up">
          
          {/* Logo Showcase */}
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-brand-600 dark:text-brand-400 text-xs font-semibold tracking-wide mb-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            <span>SIH 2026 Official Live Submission Tracker</span>
          </div>

          <div className="flex justify-center mb-2">
            <div className="relative group cursor-pointer" onClick={() => navigate('/')}>
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-amber-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
              <img 
                src="/logo.png" 
                alt="SIH Tracker Logo" 
                className="relative w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-2xl rounded-2xl p-1 bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            Track <span className="orange-gradient-text">SIH 2026 Submissions</span> in Real Time
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Instant live seat counter, automated push notification alerts, and full submission history analytics for all Smart India Hackathon problem statements.
          </p>

          {/* Search Form */}
          <form onSubmit={handleTrack} className="w-full max-w-lg mx-auto pt-4">
            <div className="relative flex items-center bg-white dark:bg-navy-800/90 rounded-full p-2 pl-6 shadow-xl border border-slate-200 dark:border-slate-700/80 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30 transition-all">
              <svg className="w-5 h-5 text-brand-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Enter PS ID (e.g. SIH26042)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 font-semibold tracking-wider uppercase text-sm sm:text-base"
                maxLength={8}
              />
              <button
                type="submit"
                disabled={loading}
                className="orange-gradient-bg px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all disabled:opacity-50 flex-shrink-0 flex items-center space-x-1"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Track Live</span>
                )}
              </button>
            </div>
            {error && <p className="text-red-500 dark:text-red-400 text-xs font-semibold mt-3 animate-fade-in">{error}</p>}
          </form>

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Quick Check:</span>
            {featuredPsIds.map((id) => (
              <button
                key={id}
                onClick={() => {
                  addPS(id);
                  navigate(`/ps/${id}`);
                }}
                className="px-2.5 py-1 rounded-md bg-slate-200/80 dark:bg-navy-800 text-slate-700 dark:text-slate-300 font-mono font-semibold hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 transition-colors"
              >
                {id}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* Live Collector Node Status */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full mb-2">
        <NodeStatusBadge />
      </div>

      {/* Tracked List Section */}
      <section className="flex-grow px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <svg className="w-6 h-6 mr-2 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
            My Tracked Statements
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {tracked.length} statement{tracked.length === 1 ? '' : 's'} saved
          </span>
        </div>
        
        {tracked.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl border-dashed border-2 border-slate-200 dark:border-slate-800 p-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-slate-700 dark:text-slate-300 font-semibold text-base">No Problem Statements Tracked Yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enter a PS ID above (e.g. SIH26042) to monitor submission counts in real time.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tracked.map((t) => (
              <PSCard key={t.psId} psId={t.psId} onRemove={() => removePS(t.psId)} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
