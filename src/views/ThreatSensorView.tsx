import React, { useState, useEffect, useCallback } from 'react';
import { useSecurity } from '../context/SecurityContext';
import {
  HardDrive,
  Usb,
  Network,
  Lock,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Eye,
  Ban,
  Cpu,
  Wifi,
  Server,
  Monitor
} from 'lucide-react';

interface DiskStat {
  name: string;
  mount: string;
  total: number;
  used: number;
  free: number;
  usedPct: number;
  driveType?: 'Fixed' | 'Removable' | 'Network' | 'CD-ROM';
  suspicious: boolean;
  reason?: string;
}

interface PortStat {
  port: number;
  protocol: string;
  state: string;
  service: string;
  address?: string;
  pid?: number;
  risk: 'Safe' | 'Suspicious' | 'Critical';
  reason?: string;
}

interface UsbDevice {
  id: string;
  name: string;
  vendor: string;
  serial: string;
  connectedAt: string;
  status: 'Trusted' | 'Suspicious' | 'Blocked';
  isRemovableDrive?: boolean;
  driveLetter?: string;
  reason?: string;
}

interface BruteForceEvent {
  id: string;
  sourceIp: string;
  targetUser: string;
  attempts: number;
  lastAttempt: string;
  blocked: boolean;
  status: 'Active' | 'Resolved';
}

interface HostInfo {
  hostname: string;
  platform: string;
  osRelease: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemGB: number;
  freeMemGB: number;
  usedMemGB: number;
  usedMemPct: number;
  uptimeSeconds: number;
  uptimeFormatted: string;
  networkInterfaces: {
    name: string;
    address: string;
    netmask: string;
    family: string;
    mac: string;
  }[];
  processMemoryMB: number;
}

interface SensorData {
  disks: DiskStat[];
  ports: PortStat[];
  usbDevices: UsbDevice[];
  bruteForce: BruteForceEvent[];
  lastScanned: string;
  threatScore: number;
  hostInfo?: HostInfo;
}

export const ThreatSensorView: React.FC = () => {
  const { token, addNotification } = useSecurity();
  const [data, setData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'disks' | 'ports' | 'usb' | 'bruteforce'>('disks');
  const [blockingId, setBlockingId] = useState<string | null>(null);

  const fetchSensorData = useCallback(async () => {
    try {
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/sensors/scan', { headers });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Real sensor scan failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 6000);
    return () => clearInterval(interval);
  }, [fetchSensorData]);

  const handleBlockUsb = async (deviceId: string) => {
    setBlockingId(deviceId);
    try {
      const res = await fetch('/api/sensors/usb/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ deviceId })
      });
      const json = await res.json();
      if (json.success) {
        addNotification(`Hardware peripheral ${deviceId} has been BLOCKED.`);
        fetchSensorData();
      }
    } finally {
      setBlockingId(null);
    }
  };

  const handleUnblockBrute = async (eventId: string) => {
    try {
      const res = await fetch('/api/sensors/bruteforce/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId })
      });
      const json = await res.json();
      if (json.success) {
        addNotification(`Brute-force security event resolved & source IP unblocked.`);
        fetchSensorData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const riskColor = (r: string) => {
    if (r === 'Critical') return 'text-red-400 bg-red-950/20 border-red-500/20';
    if (r === 'Suspicious') return 'text-amber-400 bg-amber-950/20 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20';
  };

  const usbStatusColor = (s: string) => {
    if (s === 'Blocked') return 'text-red-400 bg-red-950/20 border-red-500/20';
    if (s === 'Suspicious') return 'text-amber-400 bg-amber-950/20 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20';
  };

  const tabs = [
    { id: 'disks', label: 'Disks & Storage', icon: HardDrive },
    { id: 'ports', label: 'Listening Ports', icon: Network },
    { id: 'usb', label: 'USB & Pendrives', icon: Usb },
    { id: 'bruteforce', label: 'Login Attacks', icon: Lock },
  ] as const;

  const threatScore = data?.threatScore ?? 0;
  const scoreColor = threatScore >= 70 ? 'text-red-400' : threatScore >= 40 ? 'text-amber-400' : 'text-emerald-400';
  const host = data?.hostInfo;

  return (
    <div className="space-y-6 select-none font-mono">

      {/* Header + Real Threat Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400 animate-pulse" />
            Live System Hardware & Port Sensor Suite
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real host hardware telemetry, listening sockets, removable USB pendrives & brute-force attack detection
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Live Threat Index</p>
            <p className={`text-xl font-bold font-mono mt-0.5 ${scoreColor}`}>{threatScore}<span className="text-xs text-slate-500">/100</span></p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchSensorData(); }}
            className="p-2.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Rescan host hardware"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Real Host Hardware Telemetry Card */}
      {host && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
            <Monitor size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-slate-200">HOST SYSTEM TELEMETRY</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
              VERIFIED LIVE
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <span className="text-[9px] text-slate-500 block uppercase">HOSTNAME</span>
              <span className="text-slate-200 font-bold truncate block">{host.hostname}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase">PLATFORM</span>
              <span className="text-slate-300 truncate block">{host.platform}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase">CPU CORES</span>
              <span className="text-slate-300 truncate block">{host.cpuCores} Cores ({host.cpuModel.split('@')[0].trim()})</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase">RAM UTILIZATION</span>
              <span className="text-slate-300 block">{host.usedMemGB} / {host.totalMemGB} GB ({host.usedMemPct}%)</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase">SYSTEM UPTIME</span>
              <span className="text-slate-300 block">{host.uptimeFormatted}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase">LOCAL IP</span>
              <span className="text-blue-400 font-bold block truncate">
                {host.networkInterfaces[0]?.address || '127.0.0.1'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Storage Volumes', value: data?.disks.length ?? 0, icon: HardDrive, color: 'text-blue-400', sub: `${data?.disks.filter(d => d.suspicious).length ?? 0} warning` },
          { label: 'Active Ports', value: data?.ports.length ?? 0, icon: Network, color: 'text-amber-400', sub: `${data?.ports.filter(p => p.risk === 'Critical').length ?? 0} critical risk` },
          { label: 'USB Hardware', value: data?.usbDevices.length ?? 0, icon: Usb, color: 'text-purple-400', sub: `${data?.usbDevices.filter(u => u.isRemovableDrive).length ?? 0} pendrives` },
          { label: 'Brute-Force Incidents', value: data?.bruteForce.length ?? 0, icon: Lock, color: 'text-red-400', sub: `${data?.bruteForce.filter(b => b.status === 'Active').length ?? 0} active IP bans` },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-slate-950 border border-slate-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon size={16} className={card.color} />
                <span className={`text-2xl font-bold font-mono ${card.value > 0 ? card.color : 'text-slate-500'}`}>{card.value}</span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{card.label}</p>
              <p className="text-[9px] text-slate-500 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-950 border border-slate-900 rounded-xl p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold flex-1 justify-center transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl p-5">

        {/* REAL DISKS TAB */}
        {activeTab === 'disks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <HardDrive size={11} /> Real Storage Volumes & Pendrives on Host
              </p>
              <span className="text-[9px] text-slate-500">Live fs.statfs telemetry</span>
            </div>
            {(data?.disks ?? []).map((disk, i) => (
              <div key={i} className={`p-4 rounded-xl border ${disk.suspicious ? 'border-amber-500/30 bg-amber-950/20' : 'border-slate-900 bg-slate-900/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive size={15} className={disk.driveType === 'Removable' ? 'text-purple-400' : 'text-blue-400'} />
                    <span className="text-xs font-bold text-slate-200">{disk.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Mount: {disk.mount}</span>
                    {disk.driveType && (
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${disk.driveType === 'Removable' ? 'bg-purple-950/40 text-purple-300 border-purple-500/20' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                        {disk.driveType.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {disk.suspicious ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded">
                      <AlertTriangle size={9} /> SPACE CRITICAL
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded">
                      <CheckCircle size={9} /> HEALTHY
                    </span>
                  )}
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${disk.usedPct > 90 ? 'bg-red-500' : disk.usedPct > 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${disk.usedPct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] font-mono text-slate-400">
                  <span>Used: {disk.used} GB / {disk.total} GB</span>
                  <span>{disk.free} GB Free ({disk.usedPct}% utilized)</span>
                </div>
                {disk.reason && (
                  <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                    <AlertTriangle size={10} /> {disk.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* REAL PORTS TAB */}
        {activeTab === 'ports' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Network size={11} /> Real Listening Ports & Socket Surface (netstat live audit)
              </p>
              <span className="text-[9px] text-slate-500">{data?.ports.length} sockets bound</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-900">
                    <th className="text-left text-[9px] text-slate-500 uppercase tracking-wider py-2 pr-4">Port</th>
                    <th className="text-left text-[9px] text-slate-500 uppercase tracking-wider py-2 pr-4">Protocol</th>
                    <th className="text-left text-[9px] text-slate-500 uppercase tracking-wider py-2 pr-4">Service Name</th>
                    <th className="text-left text-[9px] text-slate-500 uppercase tracking-wider py-2 pr-4">Bind Address</th>
                    <th className="text-left text-[9px] text-slate-500 uppercase tracking-wider py-2 pr-4">PID</th>
                    <th className="text-left text-[9px] text-slate-500 uppercase tracking-wider py-2">Security Risk</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {(data?.ports ?? []).map((p, i) => (
                    <tr key={i} className="border-b border-slate-900/60 hover:bg-slate-900/20">
                      <td className="py-2.5 pr-4 font-mono font-bold text-slate-200">{p.port}</td>
                      <td className="py-2.5 pr-4 text-slate-400">{p.protocol}</td>
                      <td className="py-2.5 pr-4 text-slate-300 font-semibold">{p.service}</td>
                      <td className="py-2.5 pr-4 font-mono text-[10px] text-slate-400">{p.address || '0.0.0.0'}</td>
                      <td className="py-2.5 pr-4 font-mono text-[10px] text-slate-500">{p.pid || '-'}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${riskColor(p.risk)}`}>
                            {p.risk.toUpperCase()}
                          </span>
                          {p.reason && (
                            <span className="text-[9px] text-slate-500 hidden md:inline">{p.reason}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REAL USB TAB */}
        {activeTab === 'usb' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Usb size={11} /> Real Physical USB Controllers & Removable Pendrives
              </p>
              <span className="text-[9px] text-slate-500">Live PnP & CIM Hardware Bus</span>
            </div>
            {(data?.usbDevices ?? []).map((dev) => (
              <div
                key={dev.id}
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                  dev.status === 'Blocked'
                    ? 'border-red-500/30 bg-red-950/20'
                    : dev.status === 'Suspicious'
                    ? 'border-amber-500/30 bg-amber-950/20'
                    : 'border-slate-900 bg-slate-900/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Usb size={15} className={dev.isRemovableDrive ? 'text-purple-400' : dev.status === 'Blocked' ? 'text-red-400' : 'text-blue-400'} />
                    <span className="text-xs font-bold text-slate-200">{dev.name}</span>
                    {dev.isRemovableDrive && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30 animate-pulse">
                        PENDRIVE DETECTED
                      </span>
                    )}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${usbStatusColor(dev.status)}`}>
                      {dev.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Vendor: <span className="text-slate-300">{dev.vendor}</span> · Hardware Serial: <span className="text-slate-300">{dev.serial}</span>
                  </p>
                  {dev.driveLetter && (
                    <p className="text-[10px] text-emerald-400 font-bold">
                      Mounted Drive Letter: {dev.driveLetter}
                    </p>
                  )}
                  {dev.reason && (
                    <p className="text-[10px] text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} /> {dev.reason}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {dev.status !== 'Blocked' ? (
                    <button
                      onClick={() => handleBlockUsb(dev.id)}
                      disabled={blockingId === dev.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-[10px] font-bold text-red-300 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Ban size={11} />
                      {blockingId === dev.id ? 'Blocking...' : 'Block Peripheral'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-950/40 border border-red-500/30 px-2 py-1 rounded">
                      <XCircle size={12} /> Hardware Blocked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REAL BRUTE FORCE TAB */}
        {activeTab === 'bruteforce' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Lock size={11} /> Real Failed Login & Brute-Force Password Interception
              </p>
              <span className="text-[9px] text-slate-500">Auto-ban threshold: 5 attempts</span>
            </div>
            {(data?.bruteForce ?? []).length === 0 ? (
              <div className="text-center py-12 space-y-1">
                <CheckCircle size={24} className="mx-auto text-emerald-500" />
                <p className="text-xs text-slate-300 font-bold">No active brute-force attacks on host</p>
                <p className="text-[10px] text-slate-600">
                  Failed authentication attempts on /api/auth/login are intercepted here in real time.
                </p>
              </div>
            ) : (
              (data?.bruteForce ?? []).map((evt) => (
                <div
                  key={evt.id}
                  className={`p-4 rounded-xl border ${
                    evt.status === 'Active'
                      ? 'border-red-500/30 bg-red-950/20'
                      : 'border-slate-900 bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Lock size={15} className={evt.status === 'Active' ? 'text-red-400' : 'text-slate-400'} />
                        <span className="text-xs font-bold text-slate-200 font-mono">Source IP: {evt.sourceIp}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${evt.status === 'Active' ? 'text-red-400 bg-red-950/40 border-red-500/30' : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'}`}>
                          {evt.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Target Account: <span className="font-mono text-red-300">{evt.targetUser}</span>
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-bold text-red-400">
                          <Activity size={11} /> {evt.attempts} failed password attempts
                        </span>
                        <span>Last probe: {new Date(evt.lastAttempt).toLocaleTimeString()}</span>
                      </div>
                      {evt.blocked && (
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold mt-1">
                          <Ban size={11} /> IP Auto-Blacklisted on Gateway Firewall
                        </p>
                      )}
                    </div>
                    {evt.status === 'Active' && (
                      <button
                        onClick={() => handleUnblockBrute(evt.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-300 cursor-pointer transition-colors shrink-0"
                      >
                        <CheckCircle size={11} />
                        Resolve & Unblock IP
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Footer Info */}
      {data && (
        <p className="text-[10px] text-slate-600 text-center font-mono">
          Last live sensor scan: {new Date(data.lastScanned).toLocaleTimeString()} · Querying real Windows host hardware APIs
        </p>
      )}
    </div>
  );
};
