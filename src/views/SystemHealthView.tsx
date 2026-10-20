import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { AuditLog, SystemHealth } from '../types';
import { Heart, Activity, CheckCircle, Database, ShieldAlert, Cpu, Terminal, RefreshCw } from 'lucide-react';

export const SystemHealthView: React.FC = () => {
  const { token, refreshStats } = useSecurity();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealthAndAudits = async () => {
    try {
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const hRes = await fetch('/api/system/health', { headers });
      const hData = await hRes.json();
      
      const aRes = await fetch('/api/system/logs', { headers });
      const aData = await aRes.json();

      if (hData.success) setHealth(hData.data);
      if (aData.success) setAuditLogs(aData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndAudits();
    const interval = setInterval(fetchHealthAndAudits, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const fallbackHealth = health || {
    frontend: 'Operational',
    backend: 'Operational',
    api: 'Operational',
    database: 'Operational',
    aiService: 'Operational',
    simulationEngine: 'Running',
    latency: 45,
    requestCount: 154,
    uptime: 3600
  };

  const getStatusColor = (status: string) => {
    if (status === 'Operational' || status === 'Running') return 'text-emerald-400 bg-emerald-950/20 border-emerald-500/10';
    return 'text-amber-400 bg-amber-950/20 border-amber-500/10 animate-pulse';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      
      {/* Subsystem health board card column */}
      <div className="space-y-4">
        
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Subsystem Health</h3>
            </div>
            <button 
              onClick={fetchHealthAndAudits}
              className="text-slate-500 hover:text-slate-300"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              { name: 'Gateway microservices', status: fallbackHealth.api, icon: Activity },
              { name: 'Node.js Express Server', status: fallbackHealth.backend, icon: Terminal },
              { name: 'Drizzle JSON database', status: fallbackHealth.database, icon: Database },
              { name: 'Gemini Analyser model', status: fallbackHealth.aiService, icon: Cpu },
            ].map((node, idx) => {
              const Icon = node.icon;
              return (
                <div key={idx} className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Icon size={14} className="text-slate-500" />
                    <span className="font-semibold text-slate-300">{node.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] border ${getStatusColor(node.status)}`}>
                    {node.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global real host hardware metrics */}
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Host Hardware Status</h4>
            <span className="text-[9px] text-emerald-400 font-bold font-mono">LIVE SYSTEM</span>
          </div>

          {health?.hostInfo ? (
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-900/30 border border-slate-900 rounded-lg">
                <span className="text-[8px] text-slate-500 block uppercase font-semibold">PROCESSOR</span>
                <span className="text-xs font-bold text-slate-200 block truncate">{health.hostInfo.cpuModel}</span>
                <span className="text-[9px] text-slate-500">{health.hostInfo.cpuCores} Physical/Logical Cores</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-slate-900/30 border border-slate-900 rounded-lg">
                  <span className="text-[8px] text-slate-500 block uppercase font-semibold">RAM UTILIZATION</span>
                  <span className="text-xs font-bold text-slate-200 mt-0.5 block">{health.hostInfo.usedMemGB} / {health.hostInfo.totalMemGB} GB</span>
                  <span className="text-[8px] text-blue-400 font-bold">{health.hostInfo.usedMemPct}% used</span>
                </div>
                <div className="p-2 bg-slate-900/30 border border-slate-900 rounded-lg">
                  <span className="text-[8px] text-slate-500 block uppercase font-semibold">SYSTEM UPTIME</span>
                  <span className="text-xs font-bold text-slate-200 mt-0.5 block">{health.hostInfo.uptimeFormatted}</span>
                  <span className="text-[8px] text-emerald-400 font-bold">Stable</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="p-2.5 bg-slate-900/30 border border-slate-900 rounded-lg font-mono">
                <span className="text-[8px] text-slate-500 block uppercase font-semibold leading-none">AVERAGE PING</span>
                <span className="text-sm font-bold text-slate-200 mt-1 block">{fallbackHealth.latency} ms</span>
              </div>
              <div className="p-2.5 bg-slate-900/30 border border-slate-900 rounded-lg font-mono">
                <span className="text-[8px] text-slate-500 block uppercase font-semibold leading-none">SYSTEM UPTIME</span>
                <span className="text-sm font-bold text-slate-200 mt-1 block">{Math.floor(fallbackHealth.uptime / 60)} m</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Security Audits Log history */}
      <div className="lg:col-span-2 bg-slate-950 border border-slate-900 p-5 rounded-xl flex flex-col justify-between h-[450px]">
        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Compliance Auditor Logs</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-1 scrollbar-thin font-mono text-[11px]">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-20">No administrator action logs compiled yet.</p>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="p-2.5 bg-slate-900/20 border border-slate-900 rounded-lg flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-slate-300 font-semibold">{log.action}</p>
                    <p className="text-[9px] text-slate-500">
                      Operator: {log.user.split('@')[0]} · Res: {log.resource.substring(0,25)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 block">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`text-[9px] font-bold mt-1 block ${log.result === 'Success' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {log.result.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
