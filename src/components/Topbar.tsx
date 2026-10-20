import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';
import { Bell, Search, Activity, Bot, Cpu, ShieldAlert, CheckCircle, Menu, LogOut, ChevronRight, X } from 'lucide-react';

interface TopbarProps {
  onMenuToggle: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuToggle }) => {
  const { user, stats, notifications, clearNotifications, logout, packets, alerts } = useSecurity();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ packets: any[]; alerts: any[] } | null>(null);

  // Derive page name from route
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/') return ['Platform', 'Overview'];
    const formatted = path.substring(1).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return ['Platform', formatted];
  };

  const breadcrumbs = getBreadcrumbs();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (!val.trim()) {
      setSearchResults(null);
      return;
    }

    const term = val.toLowerCase();
    const filteredPackets = packets.filter(p => 
      p.sourceIp.includes(term) || 
      p.destIp.includes(term) || 
      p.classification.toLowerCase().includes(term) ||
      p.payload.toLowerCase().includes(term)
    ).slice(0, 4);

    const filteredAlerts = alerts.filter(a => 
      a.sourceIp.includes(term) || 
      a.attackType.toLowerCase().includes(term) ||
      a.severity.toLowerCase().includes(term)
    ).slice(0, 4);

    setSearchResults({ packets: filteredPackets, alerts: filteredAlerts });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 sticky top-0 flex items-center justify-between px-6 z-20">
      {/* Zone 1: Breadcrumbs & Responsive Toggle */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuToggle}
          className="p-1.5 rounded-lg hover:bg-slate-900 md:hidden text-slate-400 cursor-pointer"
        >
          <Menu size={18} />
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-400 select-none">
          <span>{breadcrumbs[0]}</span>
          <ChevronRight size={12} className="text-slate-600" />
          <span className="text-slate-200 font-semibold">{breadcrumbs[1]}</span>
        </div>
      </div>

      {/* Zone 2: Global Search */}
      <div className="flex-1 max-w-md mx-6 relative">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search packets, IPs, threat alerts..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-slate-900/60 hover:bg-slate-900 focus:bg-slate-900 border border-slate-900 focus:border-blue-500/50 rounded-lg py-1.5 pl-10 pr-8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={clearSearch}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Global Search Results overlay */}
        {searchResults && (
          <div className="absolute top-11 left-0 w-full bg-slate-950 border border-slate-900 rounded-xl shadow-2xl p-4 space-y-4 max-h-[400px] overflow-y-auto z-40">
            {searchResults.alerts.length === 0 && searchResults.packets.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-2">No matching security records found.</p>
            )}

            {searchResults.alerts.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Alert Triggers</p>
                <div className="space-y-1.5">
                  {searchResults.alerts.map(a => (
                    <div 
                      key={a.id} 
                      onClick={() => { navigate('/alerts'); clearSearch(); }}
                      className="p-2 hover:bg-slate-900 rounded-lg cursor-pointer flex justify-between items-center border border-slate-900"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{a.attackType}</p>
                        <p className="text-[10px] text-slate-500">Src: {a.sourceIp}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        a.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
                        a.severity === 'High' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/10' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.packets.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Captured Packets</p>
                <div className="space-y-1.5">
                  {searchResults.packets.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { navigate('/monitoring'); clearSearch(); }}
                      className="p-2 hover:bg-slate-900 rounded-lg cursor-pointer flex justify-between items-center border border-slate-900"
                    >
                      <div>
                        <p className="text-xs text-slate-200 font-mono text-[11px]">{p.id}</p>
                        <p className="text-[10px] text-slate-500">{p.protocol} · {p.sourceIp} → {p.destIp}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{p.size} bytes</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 3: SOC Status Telemetry + Alerts Tray */}
      <div className="flex items-center gap-6">
        {/* SOC Live Indicators */}
        <div className="hidden lg:flex items-center gap-5 border-r border-slate-900 pr-5">
          <div className="flex items-center gap-1.5 select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 leading-none">SYS HEALTH</span>
              <span className="text-[10px] text-slate-300 font-bold leading-none mt-0.5">OPERATIONAL</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 select-none">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stats.isSimulating ? 'bg-blue-400' : 'bg-slate-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${stats.isSimulating ? 'bg-blue-500' : 'bg-slate-500'}`}></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 leading-none">TRAFFIC DEEP_WALK</span>
              <span className="text-[10px] text-slate-300 font-bold leading-none mt-0.5">
                {stats.isSimulating ? `MONITORING (${stats.packetRate} p/s)` : 'STANDBY (PAUSED)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 leading-none">ML ENGINE</span>
              <span className="text-[10px] text-slate-300 font-bold leading-none mt-0.5 uppercase">ADAPTIVE MODE</span>
            </div>
          </div>
        </div>

        {/* Notifications Tray bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotif(!showNotif)}
            className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors relative"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-3 w-80 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl p-1 z-40">
              <div className="p-3 border-b border-slate-900 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200">Real-Time Threat logs</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={clearNotifications}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No threat alarms generated in this session.</p>
                ) : (
                  notifications.map((msg, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 text-slate-300 hover:bg-slate-900 border-b border-slate-900/60 last:border-b-0"
                    >
                      <p className="text-[11px] leading-relaxed">{msg}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
