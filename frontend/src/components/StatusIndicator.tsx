import React, { useState, useEffect } from 'react';
import { formatRelativeTime } from '../utils/format';

interface StatusIndicatorProps {
  status: 'live' | 'stale' | 'error' | 'unknown';
  lastFetchAt: string | null;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, lastFetchAt }) => {
  const [timeStr, setTimeStr] = useState(formatRelativeTime(lastFetchAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeStr(formatRelativeTime(lastFetchAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastFetchAt]);

  const getStatusContent = () => {
    switch (status) {
      case 'live':
        return {
          dotClass: 'bg-green-500 animate-pulse-glow',
          textClass: 'text-green-500',
          text: 'LIVE'
        };
      case 'stale':
        return {
          dotClass: 'bg-yellow-500',
          textClass: 'text-yellow-500',
          text: 'DATA STALE'
        };
      case 'error':
        return {
          dotClass: 'bg-red-500',
          textClass: 'text-red-500',
          text: 'ERROR'
        };
      default:
        return {
          dotClass: 'bg-gray-500',
          textClass: 'text-gray-500',
          text: 'UNKNOWN'
        };
    }
  };

  const { dotClass, textClass, text } = getStatusContent();

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`}></div>
      <span className={`font-semibold tracking-wide ${textClass}`}>● {text}</span>
      <span className="text-gray-400">· Last updated {timeStr}</span>
    </div>
  );
};
