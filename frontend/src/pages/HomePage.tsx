import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PSCard } from '../components/PSCard';
import { useTrackedPS } from '../hooks/useTrackedPS';
import { validatePsId, normalizePsId } from '../utils/format';

export const HomePage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { tracked, addPS, removePS } = useTrackedPS();

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!searchInput.trim()) return;
    
    const id = normalizePsId(searchInput);
    
    if (!validatePsId(id)) {
      setError('Invalid format. Must be SIH26XXX (e.g. SIH26042)');
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
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-3xl mx-auto space-y-8 animate-slide-up">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              SIH 2026
            </span>
            <br className="md:hidden" /> Live Tracker
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            Monitor real-time submission counts for Smart India Hackathon problem statements. Never miss when spots fill up.
          </p>

          <form onSubmit={handleTrack} className="w-full max-w-md mx-auto mt-10">
            <div className="relative flex items-center glass rounded-full p-2 pl-6 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <input
                type="text"
                placeholder="Enter PS ID (e.g. SIH26042)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-white placeholder-gray-500 font-medium tracking-wide uppercase"
                maxLength={8}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Tracking...' : 'Track'}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mt-3 animate-fade-in">{error}</p>}
          </form>
        </div>
      </section>

      {/* Tracked List */}
      <section className="flex-grow px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
          </svg>
          My Tracked Statements
        </h2>
        
        {tracked.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl border-dashed">
            <p className="text-gray-400">You haven't tracked any problem statements yet.</p>
            <p className="text-sm text-gray-500 mt-2">Enter an ID above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tracked.map((t) => (
              <PSCard key={t.psId} psId={t.psId} onRemove={() => removePS(t.psId)} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500 border-t border-gray-800 flex-shrink-0">
        <p>Data sourced from the publicly available SIH 2026 Problem Statement portal.</p>
      </footer>
    </div>
  );
};
