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
    time: new Date(d.timestamp).getTime(),
    count: d.count
  })).sort((a, b) => a.time - b.time);

  return (
    <div className="glass p-6 rounded-xl mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Submission History</h3>
        <div className="flex bg-gray-900 rounded-lg p-1">
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                range === r ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400">Loading history...</div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center text-red-400">{error}</div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">No history data available for this range.</div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis 
                dataKey="time" 
                tickFormatter={(tick) => format(tick, range === '7D' ? 'MMM d' : 'HH:mm')}
                stroke="#6b7280"
                tick={{fill: '#9ca3af', fontSize: 12}}
                dy={10}
              />
              <YAxis 
                stroke="#6b7280" 
                tick={{fill: '#9ca3af', fontSize: 12}}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem' }}
                itemStyle={{ color: '#60a5fa' }}
                labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                labelFormatter={(label) => format(label, 'MMM d, yyyy HH:mm:ss')}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={2}
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
