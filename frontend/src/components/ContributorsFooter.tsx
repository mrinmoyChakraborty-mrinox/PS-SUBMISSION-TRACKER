import React, { useEffect, useState } from 'react';

interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export const ContributorsFooter: React.FC = () => {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('https://api.github.com/repos/mrinmoyChakraborty-mrinox/PS-SUBMISSION-TRACKER/contributors')
      .then((res) => {
        if (!res.ok) throw new Error('GitHub API response not OK');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setContributors(data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch live GitHub contributors:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const hasMrinmoy = contributors.some(
    (c) => c.login.toLowerCase().includes('mrinmoy')
  );

  return (
    <footer className="py-10 text-center border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/60 dark:bg-navy-900/60 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 space-y-4">
        
        {/* Brand & Attribution */}
        <div className="flex items-center justify-center space-x-2">
          <img src="/logo.png" alt="SIH Tracker Logo" className="w-6 h-6 rounded-lg object-contain bg-white dark:bg-navy-950 p-0.5 border border-slate-200 dark:border-slate-800" />
          <span className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">
            SIH <span className="text-brand-500">TRACKER</span>
          </span>
        </div>

        {/* Dynamic Contributors Display */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <span>Crafted with ❤️ by{!hasMrinmoy && (
              <a 
                href="https://github.com/mrinmoyChakraborty-mrinox" 
                target="_blank" 
                rel="noreferrer"
                className="text-brand-500 font-bold hover:underline"
              >
                Mrinmoy Chakraborty
              </a>
            )}</span>
            
            <span>and GitHub Contributors</span>
          </p>

          {/* Live Contributor Avatars */}
          {!loading && contributors.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {contributors.map((c) => (
                <a
                  key={c.login}
                  href={c.html_url}
                  target="_blank"
                  rel="noreferrer"
                  title={`${c.login} (${c.contributions} contribution${c.contributions === 1 ? '' : 's'})`}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-700/80 hover:border-brand-500/80 hover:scale-105 transition-all shadow-sm group"
                >
                  <img src={c.avatar_url} alt={c.login} className="w-5 h-5 rounded-full object-cover" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-brand-500">
                    {c.login}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-400">
          Data mirrored live from the official Smart India Hackathon 2026 portal. Community-built open source project.
        </p>

      </div>
    </footer>
  );
};
