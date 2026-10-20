import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { BarChart3, TrendingUp, Download, PieChart, ShieldAlert, FileText, CheckCircle } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { packets, alerts, stats, addNotification } = useSecurity();

  // Compute protocol distribution ratios
  const protocolsCount = { TCP: 0, UDP: 0, ICMP: 0, DNS: 0, HTTP: 0 };
  packets.forEach(p => {
    if (p.protocol in protocolsCount) {
      protocolsCount[p.protocol as keyof typeof protocolsCount]++;
    }
  });

  const totalProtos = Math.max(1, packets.length);
  const tcpRatio = parseFloat(((protocolsCount.TCP / totalProtos) * 100).toFixed(1));
  const httpRatio = parseFloat(((protocolsCount.HTTP / totalProtos) * 100).toFixed(1));
  const dnsRatio = parseFloat(((protocolsCount.DNS / totalProtos) * 100).toFixed(1));
  const otherRatio = parseFloat((( (protocolsCount.UDP + protocolsCount.ICMP) / totalProtos) * 100).toFixed(1));

  // Compute alert severity distribution
  const severityCount = { Critical: 0, High: 0, Medium: 0, Low: 0, Informational: 0 };
  alerts.forEach(a => {
    if (a.severity in severityCount) {
      severityCount[a.severity as keyof typeof severityCount]++;
    }
  });

  return (
    <div className="space-y-6 select-none">
      
      {/* Overview stats bar */}
      <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deep Traffic Analytics</h3>
            <p className="text-[11px] text-slate-500 mt-1">Aggregated statistics and deep telemetry parsed over active gateway ports.</p>
          </div>
          <button 
            onClick={() => {
              addNotification('DATA EXPORT: Dispatched full analytics database package.');
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Export dataset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Box 1 */}
          <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Protocol Distribution</span>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">HTTP Web Ingress</span>
                <span className="font-bold text-slate-200">{httpRatio}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1 rounded overflow-hidden">
                <div style={{ width: `${httpRatio}%` }} className="bg-blue-500 h-full rounded"></div>
              </div>

              <div className="flex justify-between font-mono">
                <span className="text-slate-400">TCP Socket Pings</span>
                <span className="font-bold text-slate-200">{tcpRatio}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1 rounded overflow-hidden">
                <div style={{ width: `${tcpRatio}%` }} className="bg-cyan-500 h-full rounded"></div>
              </div>

              <div className="flex justify-between font-mono">
                <span className="text-slate-400">DNS Tunneling</span>
                <span className="font-bold text-slate-200">{dnsRatio}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1 rounded overflow-hidden">
                <div style={{ width: `${dnsRatio}%` }} className="bg-purple-500 h-full rounded"></div>
              </div>
            </div>
          </div>

          {/* Box 2 */}
          <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Alarms Threat severity</span>
            
            <div className="grid grid-cols-2 gap-3 text-center text-xs pt-1 select-none">
              <div className="p-2 bg-red-950/10 border border-red-500/10 rounded-lg">
                <span className="text-red-400 font-bold font-mono text-sm">{severityCount.Critical}</span>
                <span className="text-[8px] text-slate-500 block uppercase font-semibold">Critical</span>
              </div>
              <div className="p-2 bg-orange-950/10 border border-orange-500/10 rounded-lg">
                <span className="text-orange-400 font-bold font-mono text-sm">{severityCount.High}</span>
                <span className="text-[8px] text-slate-500 block uppercase font-semibold">High</span>
              </div>
              <div className="p-2 bg-yellow-950/10 border border-yellow-500/10 rounded-lg">
                <span className="text-yellow-400 font-bold font-mono text-sm">{severityCount.Medium}</span>
                <span className="text-[8px] text-slate-500 block uppercase font-semibold">Medium</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-400 font-bold font-mono text-sm">{severityCount.Low}</span>
                <span className="text-[8px] text-slate-500 block uppercase font-semibold">Low</span>
              </div>
            </div>
          </div>

          {/* Box 3 */}
          <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">IDS Engine Comparatives</span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Adaptive Meta-Learning algorithms cluster novel Zero-Day anomalies at 99.4% recall, bypassing classical Snort filters.</p>
            </div>
            <div className="flex justify-between items-center text-xs font-mono border-t border-slate-900 pt-3">
              <span className="text-slate-500">Autonomous Block action:</span>
              <span className="text-emerald-400 font-bold">Active</span>
            </div>
          </div>
        </div>

      </div>

      {/* Target assets and attackers list tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top attackers */}
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top attacking Nodes directory</h4>
          <div className="space-y-2">
            {[
              { ip: '198.51.100.22', geo: 'RUSSIA / Proxy node VM', packets: 423, status: 'Blocked' },
              { ip: '203.0.113.111', geo: 'UNITED STATES / Tor gateway', packets: 182, status: 'Active Policy' },
              { ip: '185.22.174.15', geo: 'GERMANY / Cloud instance', packets: 92, status: 'Isolated' },
            ].map((node, idx) => (
              <div key={idx} className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg flex justify-between items-center text-xs font-mono">
                <div>
                  <p className="font-bold text-slate-200">{node.ip}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{node.geo} · {node.packets} pkts detected</p>
                </div>
                <span className="text-[10px] font-bold text-red-400 bg-red-950/20 px-2 py-0.5 border border-red-500/10 rounded">
                  {node.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Target assets */}
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Protected Host Assets</h4>
          <div className="space-y-2">
            {[
              { ip: '10.0.1.15', name: 'Nginx Front-End', integrity: '94.2%', alerts: 8 },
              { ip: '10.0.1.30', name: 'PostgreSQL DB Core', integrity: '100.0%', alerts: 0 },
              { ip: '10.0.2.100', name: 'Kubernetes Pod Balancer', integrity: '100.0%', alerts: 0 },
            ].map((node, idx) => (
              <div key={idx} className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-200">{node.name}</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">{node.ip} · {node.alerts} alert logs</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold font-mono text-emerald-400 block">{node.integrity} Healthy</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
