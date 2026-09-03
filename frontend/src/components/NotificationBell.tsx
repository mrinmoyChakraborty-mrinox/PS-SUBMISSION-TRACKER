import React from 'react';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationBellProps {
  psId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ psId }) => {
  const { isSupported, isSubscribed, enableNotifications, disableNotifications, loading } = useNotifications(psId);

  if (!isSupported) {
    return <div className="text-slate-400 text-xs font-semibold" title="Notifications not supported by this browser">🔕 Notifications Unsupported</div>;
  }

  const handleClick = () => {
    if (isSubscribed) {
      disableNotifications();
    } else {
      enableNotifications();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-xs shadow-md transition-all ${
        isSubscribed 
          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
          : 'orange-gradient-bg shadow-orange-500/25'
      }`}
      title="Toggle push notifications for count changes"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
      ) : isSubscribed ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
          </svg>
          <span>Alerts Active (ON)</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
          <span>Enable Live Alerts</span>
        </>
      )}
    </button>
  );
};
