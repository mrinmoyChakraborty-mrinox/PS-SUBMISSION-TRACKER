import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { useHistory } from '../hooks/useHistory';

interface HistoryChartProps {
  psId: string;
}

export const HistoryChart: React.FC<HistoryChartProps> = ({ psId }) => {
  const [range, setRange] = useState('24H');
  const { history, loading, error } = useHistory(psId, range);

  const ranges = ['1H', '6H', '12H', '24H', '7D'];

  const chartData = history.map(d => ({
    time: typeof d.timestamp === 'number' ? d.timestamp : new Date(d.timestamp).getTime(),
    count: d.count
  })).filter(d => !isNaN(d.time)).sort((a, b) => a.time - b.time);

  return (
    <div className="glass p-6 rounded-3xl mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submission History Analytics</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track real-time count trajectory over time</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-navy-950 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                range === r ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500 mr-3" />
          <span className="text-xs font-semibold">Loading history logs...</span>
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-xs font-semibold">{error}</div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs font-medium space-y-2">
          <span className="text-2xl">📊</span>
          <span>No count changes recorded yet for this timeframe.</span>
          <span className="text-[11px] text-slate-500">History points log automatically when new submissions arrive.</span>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6b00" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ff6b00" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="time" 
                tickFormatter={(tick) => format(tick, range === '7D' ? 'MMM d' : 'HH:mm')}
                stroke="#94a3b8"
                tick={{fill: '#94a3b8', fontSize: 11}}
                dy={10}
              />
              <YAxis 
                stroke="#94a3b8" 
                tick={{fill: '#94a3b8', fontSize: 11}}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334151', borderRadius: '0.75rem', color: '#fff' }}
                itemStyle={{ color: '#ff6b00', fontWeight: 'bold' }}
                labelStyle={{ color: '#94a3b8', marginBottom: '0.25rem' }}
                labelFormatter={(label) => format(label, 'MMM d, yyyy HH:mm:ss')}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#ff6b00" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCount)" 
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
