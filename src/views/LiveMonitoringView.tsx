import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Packet } from '../types';
import { 
  Play, 
  Pause, 
  Settings2, 
  Search, 
  Download, 
  Trash, 
  ChevronLeft, 
  ChevronRight, 
  AlertOctagon, 
  ShieldAlert, 
  CheckCircle,
  Eye
} from 'lucide-react';

export const LiveMonitoringView: React.FC = () => {
  const { 
    packets, 
    stats, 
    toggleSimulation, 
    updatePacketRate, 
    setSelectedPacket 
  } = useSecurity();

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterProto, setFilterProto] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Perform filtering over received packet buffer
  const filteredPackets = packets.filter(p => {
    const matchesSearch = p.sourceIp.includes(search) || p.destIp.includes(search) || p.id.includes(search);
    const matchesClass = filterClass === 'ALL' || p.classification === filterClass;
    const matchesProto = filterProto === 'ALL' || p.protocol === filterProto;
    return matchesSearch && matchesClass && matchesProto;
  });

  // Pagination bounds
  const totalPages = Math.ceil(filteredPackets.length / itemsPerPage);
  const currentPackets = filteredPackets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    const headers = ['Packet ID', 'Timestamp', 'Source IP', 'Dest IP', 'Protocol', 'Source Port', 'Dest Port', 'Size', 'Classification', 'Action', 'Severity'];
    const rows = filteredPackets.map(p => [
      p.id,
      p.timestamp,
      p.sourceIp,
      p.destIp,
      p.protocol,
      p.sourcePort,
      p.destPort,
      p.size,
      p.classification,
      p.action,
      p.severity
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aegis_packets_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(filteredPackets, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(jsonStr);
    
    const exportFileDefaultName = `aegis_packets_export_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Live Host Traffic Interceptor Status telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/20 border border-slate-900 p-5 rounded-xl">
        
        {/* Real-time Sniffer Status */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Host Traffic Interceptor</label>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              LIVE SNIFFER ACTIVE
            </span>
            <div className="flex flex-col justify-center pl-2">
              <span className="text-[10px] text-slate-500 block leading-none">Capture Mode:</span>
              <span className="text-xs font-bold mt-1 text-slate-300">
                REAL HOST TRAFFIC
              </span>
            </div>
          </div>
        </div>

        {/* Speed sliders packet/sec */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            <span>PACKET INGRESS RATE</span>
            <span className="font-mono text-blue-400 font-bold">{stats.packetRate} p/s</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={stats.packetRate}
            onChange={(e) => updatePacketRate(parseFloat(e.target.value))}
            className="w-full accent-blue-500 h-1.5 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer focus:outline-none"
          />
        </div>

        {/* Total stats counters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center md:text-left bg-slate-950/60 p-2 border border-slate-900 rounded-lg select-none">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 leading-none block">Ingress Packets</span>
            <span className="text-base font-bold font-mono tracking-tight text-slate-100 mt-1 block tabular-nums">
              {stats.totalPackets.toLocaleString()}
            </span>
          </div>
          <div className="text-center md:text-left bg-slate-950/60 p-2 border border-slate-900 rounded-lg select-none">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 leading-none block">Blocked Hosts</span>
            <span className="text-base font-bold font-mono tracking-tight text-slate-100 mt-1 block tabular-nums">
              {stats.blockedCount}
            </span>
          </div>
        </div>

      </div>

      {/* Interactive Table with filters bar */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden">
        
        {/* Filters Top Bar */}
        <div className="p-4 bg-slate-900/10 border-b border-slate-900 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            
            {/* Search */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Filter IP addresses, host tags..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
              />
            </div>

            {/* Classification filter */}
            <select
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-900 text-xs text-slate-300 rounded-lg py-1.5 px-3 focus:outline-none focus:border-blue-500/50 cursor-pointer"
            >
              <option value="ALL">All Classifications</option>
              <option value="Benign">Benign Only</option>
              <option value="SQL Injection">SQL Injection</option>
              <option value="SYN Flood">SYN Flood</option>
              <option value="Port Scan">Port Scan</option>
              <option value="Zero-Day Alpha">Zero-Day Alpha</option>
              <option value="Zero-Day Beta">Zero-Day Beta</option>
            </select>

            {/* Protocol filter */}
            <select
              value={filterProto}
              onChange={(e) => { setFilterProto(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-900 text-xs text-slate-300 rounded-lg py-1.5 px-3 focus:outline-none focus:border-blue-500/50 cursor-pointer"
            >
              <option value="ALL">All Protocols</option>
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="ICMP">ICMP</option>
              <option value="HTTP">HTTP</option>
              <option value="DNS">DNS</option>
            </select>

          </div>

          {/* Export Dials */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Export CSV logs"
            >
              <Download size={13} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Export JSON payload"
            >
              <Download size={13} />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>
        </div>

        {/* Live Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 text-[10px] uppercase font-bold select-none bg-slate-950/40">
                <th className="py-3 pl-4">Packet ID</th>
                <th className="py-3">Timestamp</th>
                <th className="py-3">Direction IP</th>
                <th className="py-3">Proto</th>
                <th className="py-3">Size</th>
                <th className="py-3">Classification</th>
                <th className="py-3">Classical Engine</th>
                <th className="py-3">Meta Engine</th>
                <th className="py-3">Outcome</th>
                <th className="py-3 pr-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 text-slate-300 text-xs">
              {currentPackets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">No packets matching filtration arguments.</td>
                </tr>
              ) : (
                currentPackets.map(packet => (
                  <tr 
                    key={packet.id} 
                    onClick={() => setSelectedPacket(packet)}
                    className="hover:bg-slate-900/30 transition-all cursor-pointer group"
                  >
                    <td className="py-3 pl-4 font-mono text-[11px] text-slate-400 group-hover:text-blue-400 transition-colors font-semibold">{packet.id}</td>
                    <td className="py-3 font-mono text-[10px] text-slate-500">
                      {new Date(packet.timestamp).toLocaleTimeString([], { hour12: false })}
                    </td>
                    <td className="py-3 font-mono">
                      <span className="text-slate-200">{packet.sourceIp}</span>
                      <span className="text-slate-600 px-1">→</span>
                      <span className="text-slate-400">{packet.destIp}</span>
                    </td>
                    <td className="py-3 font-mono font-semibold text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded ${
                        packet.protocol === 'TCP' ? 'bg-slate-900 text-slate-300' :
                        packet.protocol === 'HTTP' ? 'bg-blue-950/20 text-blue-400 border border-blue-500/10' :
                        packet.protocol === 'DNS' ? 'bg-purple-950/20 text-purple-400 border border-purple-500/10' :
                        'bg-slate-900 text-slate-400'
                      }`}>
                        {packet.protocol}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400">{packet.size} B</td>
                    <td className="py-3">
                      <span className={`font-semibold ${
                        packet.classification === 'Benign' ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        {packet.classification}
                      </span>
                    </td>
                    <td className="py-3 font-mono">
                      {packet.classicalIds.detected ? (
                        <span className="text-red-400">Blocked ({packet.classicalIds.confidence}%)</span>
                      ) : (
                        <span className="text-slate-500">Bypassed</span>
                      )}
                    </td>
                    <td className="py-3 font-mono">
                      {packet.metaIds.detected ? (
                        <span className="text-cyan-400">Detected ({packet.metaIds.confidence}%)</span>
                      ) : (
                        <span className="text-slate-500">Benign</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        packet.action === 'Block' ? 'bg-red-950/20 text-red-400 border-red-500/20' :
                        packet.action === 'Alert' ? 'bg-orange-950/20 text-orange-400 border-orange-500/20' :
                        'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {packet.action}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedPacket(packet); }}
                        className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-blue-400 cursor-pointer"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-900 flex justify-between items-center bg-slate-950/40 font-mono select-none">
            <span className="text-[10px] text-slate-500">
              Showing page {currentPage} of {totalPages} ({filteredPackets.length} logs cached)
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-slate-900 border border-slate-900 text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-slate-900 border border-slate-900 text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
