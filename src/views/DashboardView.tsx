import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Activity, 
  Cpu, 
  Database, 
  Flame, 
  ArrowUpRight, 
  Globe, 
  Server, 
  Layers, 
  Lock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  BellRing
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { token, packets, alerts, stats, refreshStats, setSelectedPacket } = useSecurity();
  const navigate = useNavigate();
  
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const sRes = await fetch('/api/dashboard/stats', { headers });
      const sData = await sRes.json();
      
      const cRes = await fetch('/api/dashboard/charts', { headers });
      const cData = await cRes.json();

      if (sData.success) setDashboardStats(sData.data);
      if (cData.success) setChartData(cData.data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh stats every 4 seconds to keep dashboard charts flowing smoothly
    const interval = setInterval(fetchDashboardData, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Fallback default values if loading is active
  const trafficStats = dashboardStats?.traffic || { packetsPerSec: 1.5, totalPackets: 1240, totalAlerts: 14, blockedCount: 0 };
  const rateStats = dashboardStats?.rates || { classicalRate: 85.2, metaRate: 94.6, falsePositive: 1.4, falseNegative: 0.8 };
  const detectionStats = dashboardStats?.detections || { total: 14, critical: 2, zeroDays: 3, blocked: 0 };
  const modelStats = dashboardStats?.model || { version: 'v1.0.0 (Base)', accuracy: 94.2, f1: 93.9, adaptationsCount: 3 };

  // Helper to draw custom SVG line graph coordinates
  const renderSvgTimeline = () => {
    if (!chartData?.timeline || chartData.timeline.length === 0) return null;
    const pts = chartData.timeline;
    
    const width = 500;
    const height = 150;
    const padding = 20;

    const maxVal = 70; // Hard max based on simulation rates

    // Generate normal coordinate points
    const normalPoints = pts.map((d: any, idx: number) => {
      const x = padding + (idx * (width - padding * 2)) / (pts.length - 1);
      const y = height - padding - (d.Benign / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const malwarePoints = pts.map((d: any, idx: number) => {
      const x = padding + (idx * (width - padding * 2)) / (pts.length - 1);
      const y = height - padding - (d.Malicious / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const zeroDayPoints = pts.map((d: any, idx: number) => {
      const x = padding + (idx * (width - padding * 2)) / (pts.length - 1);
      const y = height - padding - (d.ZeroDay / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-full h-full text-slate-500 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1e293b" strokeDasharray="3 3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" />

        {/* Polylines with linear glow filters */}
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" points={normalPoints} />
        <polyline fill="none" stroke="#f97316" strokeWidth="2.5" points={malwarePoints} />
        <polyline fill="none" stroke="#ef4444" strokeWidth="2.5" points={zeroDayPoints} />

        {/* Labels */}
        <text x={padding} y={height - 4} fill="#64748b" className="text-[9px] font-mono">Real-Time</text>
        <text x={width - padding - 40} y={height - 4} fill="#64748b" className="text-[9px] font-mono">Live Stream</text>
      </svg>
    );
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Top Banner Row */}
      <div className="flex justify-between items-center bg-slate-900/20 border border-slate-900 p-4 rounded-xl">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">Aegis SOC Command Console</h2>
          <p className="text-xs text-slate-500">Autonomous Deep packet inspection driven by meta-learning neural networks.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1.5 text-xs transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-blue-400' : ''} />
          <span>Sync telemetry</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Network Traffic</span>
            <Activity size={14} className="text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">
              {trafficStats.totalPackets.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block font-mono">Rate: {trafficStats.packetsPerSec} packets/sec</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-red-500/30 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Threat Alarms</span>
            <ShieldAlert size={14} className="text-red-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">
              {detectionStats.total}
            </span>
            <span className="text-[10px] text-slate-500 block font-mono">
              Zero-Day: {detectionStats.zeroDays} · Critical: {detectionStats.critical}
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Clustering Detection</span>
            <Cpu size={14} className="text-cyan-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">
              {rateStats.metaRate}%
            </span>
            <span className="text-[10px] text-slate-500 block font-mono">
              Classical IDS Base: {rateStats.classicalRate}%
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Active Model Model</span>
            <Layers size={14} className="text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-slate-100 block truncate">{modelStats.version}</span>
            <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
              Accuracy: {modelStats.accuracy}% · Adaptations: {modelStats.adaptationsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts & Telemetry Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time traffic chart */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Network Traffic Density</h3>
              <p className="text-[11px] text-slate-500">Live categorization of network packets crossing the gateway server.</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Benign
              </span>
              <span className="flex items-center gap-1.5 text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Malicious
              </span>
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Zero-Day
              </span>
            </div>
          </div>
          <div className="h-44 flex items-center justify-center bg-slate-950/40 p-2 border border-slate-900/60 rounded-lg">
            {chartData ? renderSvgTimeline() : (
              <div className="text-xs text-slate-500 animate-pulse">Establishing line graphics context...</div>
            )}
          </div>
        </div>

        {/* Subsystems Assets health board */}
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Protected Server Node Assets</h3>
            <p className="text-[11px] text-slate-500">Physical hosts status monitoring and active firewall policy locks.</p>
          </div>

          <div className="space-y-2.5">
            {[
              { name: 'Gateway Router', ip: '10.0.1.1', status: 'Online', desc: 'Secure Nginx Proxy', icon: Globe },
              { name: 'Application Server', ip: '10.0.1.15', status: 'Isolated', desc: 'Active forensics analysis', icon: Server, isolated: true },
              { name: 'Database Node', ip: '10.0.1.30', status: 'Online', desc: 'PostgreSQL Cluster', icon: Database },
              { name: 'Kubernetes Ingress', ip: '10.0.2.100', status: 'Online', desc: 'Kubernetes Pod Balancer', icon: Layers },
            ].map(node => {
              const Icon = node.icon;
              return (
                <div 
                  key={node.ip}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                    node.isolated 
                      ? 'bg-red-500/5 border-red-500/20 text-red-400' 
                      : 'bg-slate-900/40 border-slate-900 hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      node.isolated ? 'bg-red-950/20 border-red-500/20' : 'bg-slate-900 border-slate-800'
                    }`}>
                      <Icon size={14} className={node.isolated ? 'text-red-400' : 'text-slate-400'} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{node.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{node.ip} · {node.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-right">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${node.isolated ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                    </span>
                    <span className="text-[10px] font-semibold tracking-wider font-mono">
                      {node.isolated ? 'ISOLATED' : 'SECURE'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Threat Logs Row */}
      <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Threat Alarm Stream</h3>
            <p className="text-[11px] text-slate-500">Reviewing alerts evaluated by autonomous meta-learning algorithms.</p>
          </div>
          <button 
            onClick={() => navigate('/alerts')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 hover:gap-1.5 transition-all cursor-pointer"
          >
            <span>Forensics center</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Alarm List table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 text-[10px] uppercase font-bold">
                <th className="pb-3 pl-3">Alert ID</th>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Attacker IP</th>
                <th className="pb-3">Payload Vector</th>
                <th className="pb-3">IDS Engine</th>
                <th className="pb-3">Confidence</th>
                <th className="pb-3 pr-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-slate-300 text-xs">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">No malicious threats detected in network segment.</td>
                </tr>
              ) : (
                alerts.slice(0, 5).map(alert => {
                  // Find packet to get custom payloads inspect
                  const relatedPacket = packets.find(p => p.id === alert.packetId);
                  return (
                    <tr key={alert.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 pl-3 font-mono text-[11px] font-semibold text-slate-400">{alert.id}</td>
                      <td className="py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          alert.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          alert.severity === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-3 font-mono">{alert.sourceIp}</td>
                      <td className="py-3 max-w-[200px] truncate text-slate-400">{alert.attackType}</td>
                      <td className="py-3 text-slate-400">{alert.engine}</td>
                      <td className="py-3 font-mono font-semibold text-cyan-400">{alert.confidence}%</td>
                      <td className="py-3 pr-3 text-right">
                        <button
                          onClick={() => {
                            if (relatedPacket) {
                              setSelectedPacket(relatedPacket);
                            } else {
                              navigate('/alerts');
                            }
                          }}
                          className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-blue-400 cursor-pointer transition-colors"
                        >
                          <ArrowUpRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
