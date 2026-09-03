import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useTrackedPS } from '../hooks/useTrackedPS';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { tracked } = useTrackedPS();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-navy-950/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <img 
              src="/logo.png" 
              alt="SIH TRACKER Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center">
              SIH <span className="text-brand-500 ml-1">TRACKER</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider -mt-1">
              Live Submission Monitor
            </span>
          </div>
        </Link>

        {/* Action Controls & Navigation */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {/* Tracked Counter Badge */}
          <Link 
            to="/" 
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 transition-all"
          >
            <svg className="w-3.5 h-3.5 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
            <span>Tracked</span>
            <span className="bg-brand-500 text-white px-1.5 py-0.2 rounded-full text-[10px]">
              {tracked.length}
            </span>
          </Link>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-slate-700 hover:text-brand-500 dark:hover:text-brand-400 transition-colors focus:outline-none"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              // Sun icon for Light Mode
              <svg className="w-5 h-5 text-amber-400 animate-fade-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              // Moon icon for Dark Mode
              <svg className="w-5 h-5 text-slate-700 animate-fade-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
