import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { api } from '../services/api';
import { formatRelativeTime } from '../utils/format';

interface NodeStatus {
  isActive: boolean;
  hostname: string;
  nodeDisplayName: string;
  lastRunTime?: any;
  status?: string;
}

export const NodeStatusBadge: React.FC = () => {
  const [nodeInfo, setNodeInfo] = useState<NodeStatus>({
    isActive: true,
    hostname: 'LAPTOP-D3EKRMRS',
    nodeDisplayName: 'MRINMOY (Primary Host — LAPTOP-D3EKRMRS)',
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribeStatus: (() => void) | null = null;
    let unsubscribeLease: (() => void) | null = null;

    try {
      unsubscribeStatus = onSnapshot(
        doc(db, 'system', 'collectorStatus'),
        (statusSnap) => {
          const statusData = statusSnap.exists() ? statusSnap.data() : {};
          const host = statusData.hostname || 'LAPTOP-D3EKRMRS';
          
          let displayName = 'Cloud Collector Node';
          if (host.toUpperCase().includes('LAPTOP-D3EKRMRS') || host.toUpperCase().includes('MRINMOY')) {
            displayName = 'MRINMOY (Primary Host — LAPTOP-D3EKRMRS)';
          } else if (host && host !== 'unknown') {
            displayName = `Collector Node (${host})`;
          }

          setNodeInfo((prev) => ({
            ...prev,
            hostname: host,
            nodeDisplayName: displayName,
            lastRunTime: statusData.lastRunTime || prev.lastRunTime,
            status: statusData.status || 'healthy',
          }));
          setLoading(false);
        },
        () => {
          // Fallback to REST API on Firestore snapshot error
          api.getHealth()
            .then((res: any) => {
              if (res && res.collector) {
                const c = res.collector;
                setNodeInfo({
                  isActive: c.isActive !== false,
                  hostname: c.hostname || 'LAPTOP-D3EKRMRS',
                  nodeDisplayName: c.nodeDisplayName || 'MRINMOY (Primary Host — LAPTOP-D3EKRMRS)',
                  lastRunTime: c.lastRunTime,
                  status: c.status || 'healthy',
                });
              }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        }
      );

      unsubscribeLease = onSnapshot(
        doc(db, 'system', 'collectorLease'),
        (leaseSnap) => {
          if (leaseSnap.exists()) {
            const leaseData = leaseSnap.data();
            const host = leaseData.hostname || leaseData.leaderNodeId || 'LAPTOP-D3EKRMRS';
            let displayName = 'Cloud Collector Node';
            if (host.toUpperCase().includes('LAPTOP-D3EKRMRS') || host.toUpperCase().includes('MRINMOY')) {
              displayName = 'MRINMOY (Primary Host — LAPTOP-D3EKRMRS)';
            } else if (host && host !== 'unknown') {
              displayName = `Collector Node (${host})`;
            }

            setNodeInfo((prev) => ({
              ...prev,
              hostname: host,
              nodeDisplayName: displayName,
            }));
          }
        }
      );
    } catch (e) {
      setLoading(false);
    }

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
      if (unsubscribeLease) unsubscribeLease();
    };
  }, []);

  return (
    <div className="glass px-3.5 py-2 rounded-2xl border border-orange-500/20 flex flex-wrap items-center justify-between gap-2 shadow-sm text-xs">
      <div className="flex items-center space-x-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${nodeInfo.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${nodeInfo.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </span>
        <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
          <span>Collector Status:</span>
          <span className="text-brand-500 font-black">{nodeInfo.isActive ? 'ACTIVE 🟢' : 'STANDBY 🔴'}</span>
        </span>
      </div>

      <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
          <svg className="w-3 h-3 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          {nodeInfo.nodeDisplayName}
        </span>
        {nodeInfo.lastRunTime && (
          <span className="text-slate-400 dark:text-slate-400 font-normal hidden sm:inline">
            (Synced {formatRelativeTime(nodeInfo.lastRunTime)})
          </span>
        )}
      </div>
    </div>
  );
};
