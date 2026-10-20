import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { 
  Globe, 
  ShieldCheck, 
  Server, 
  Database, 
  Layers, 
  Laptop, 
  ShieldAlert, 
  UserX,
  Play, 
  Pause, 
  Maximize2, 
  RotateCcw,
  Network
} from 'lucide-react';

interface NetworkNode {
  id: string;
  name: string;
  ip: string;
  type: 'internet' | 'firewall' | 'web' | 'database' | 'k8s' | 'client' | 'attacker';
  status: 'healthy' | 'warning' | 'compromised' | 'isolated';
  recentTraffic: number;
  threatsLogged: number;
  description: string;
}

export const NetworkMapView: React.FC = () => {
  const { addNotification } = useSecurity();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-web');
  const [nodes, setNodes] = useState<NetworkNode[]>([
    { id: 'node-internet', name: 'External Gateway / WAN', ip: 'Wi-Fi Adapter (172.20.10.7)', type: 'internet', status: 'healthy', recentTraffic: 432, threatsLogged: 0, description: 'Live physical host network interface connection.' },
    { id: 'node-attacker', name: 'Red Team Testing Actor', ip: '185.22.174.15', type: 'attacker', status: 'compromised', recentTraffic: 88, threatsLogged: 4, description: 'Offensive vector test endpoint emitting brute-force and exploit frames.' },
    { id: 'node-firewall', name: 'Aegis Live Sniffer', ip: '0.0.0.0:3000', type: 'firewall', status: 'healthy', recentTraffic: 520, threatsLogged: 0, description: 'Real-time HTTP/TCP packet interception and Snort matching engine.' },
    { id: 'node-web', name: 'Host Workstation (Venkey)', ip: '127.0.0.1 / Localhost', type: 'web', status: 'healthy', recentTraffic: 310, threatsLogged: 0, description: 'Primary host execution system running Windows 11.' },
    { id: 'node-app', name: 'Core API Server', ip: 'localhost:3000/api', type: 'web', status: 'healthy', recentTraffic: 145, threatsLogged: 0, description: 'Express backend processing live telemetry and rule evaluations.' },
    { id: 'node-db', name: 'Persistent DB Store', ip: 'db.json (Disk C:)', type: 'database', status: 'healthy', recentTraffic: 98, threatsLogged: 0, description: 'Local file-backed persistent state store.' },
    { id: 'node-k8s', name: 'Hardware USB Bus', ip: 'USB PnP Controller', type: 'k8s', status: 'healthy', recentTraffic: 24, threatsLogged: 0, description: 'Host physical USB bus and removable storage monitoring.' },
    { id: 'node-clients', name: 'Listening Sockets Subnet', ip: 'netstat surface', type: 'client', status: 'healthy', recentTraffic: 154, threatsLogged: 0, description: 'Live open TCP listening ports on the operating system.' }
  ]);

  React.useEffect(() => {
    fetch('/api/system/health')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data.hostInfo) {
          const h = json.data.hostInfo;
          const localIp = h.networkInterfaces[0]?.address || '127.0.0.1';
          setNodes(prev => prev.map(n => {
            if (n.id === 'node-web') {
              return { ...n, name: `Host Workstation (${h.hostname})`, ip: `${localIp} (${h.platform})` };
            }
            if (n.id === 'node-internet') {
              return { ...n, name: `Network Interface (${h.networkInterfaces[0]?.name || 'Wi-Fi'})`, ip: localIp };
            }
            return n;
          }));
        }
      })
      .catch(() => {});
  }, []);

  const [zoomScale, setZoomScale] = useState(1);
  const [animateFlow, setAnimateFlow] = useState(true);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const handleIsolateNode = (id: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === id) {
        const nextStatus = n.status === 'isolated' ? 'healthy' : 'isolated';
        addNotification(`TOPOLOGY SYSTEM STATE: Host [${n.name}] has been ${nextStatus === 'isolated' ? 'isolated from cluster' : 're-admitted to subnet'}.`);
        return { ...n, status: nextStatus };
      }
      return n;
    }));
  };

  const getNodeColor = (status: NetworkNode['status']) => {
    switch (status) {
      case 'healthy': return 'text-emerald-500 fill-emerald-500/10 stroke-emerald-500/20';
      case 'warning': return 'text-amber-500 fill-amber-500/10 stroke-amber-500/20';
      case 'compromised': return 'text-red-500 fill-red-500/10 stroke-red-500/20';
      case 'isolated': return 'text-slate-400 fill-slate-900/40 stroke-slate-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 select-none">
      
      {/* Network Map canvas */}
      <div className="lg:col-span-3 bg-slate-950 border border-slate-900 rounded-xl p-5 flex flex-col justify-between h-[500px] relative overflow-hidden">
        
        {/* Controls Overlay */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button 
            onClick={() => setAnimateFlow(!animateFlow)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer text-xs flex items-center gap-1"
          >
            {animateFlow ? <Pause size={14} /> : <Play size={14} />}
            <span>Flows</span>
          </button>
          <button 
            onClick={() => setZoomScale(p => Math.min(2, p + 0.1))}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer text-xs"
          >
            Zoom +
          </button>
          <button 
            onClick={() => setZoomScale(p => Math.max(0.5, p - 0.1))}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer text-xs"
          >
            Zoom -
          </button>
          <button 
            onClick={() => { setZoomScale(1); setAnimateFlow(true); }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-10 p-3 bg-slate-950/80 border border-slate-900/60 rounded-lg space-y-1.5 text-[10px] font-mono">
          <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Host States</p>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Healthy Node
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Active Warning
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> Compromised / Attacking
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span> Host Isolated
          </div>
        </div>

        {/* SVG Interactive Canvas */}
        <div className="flex-1 flex items-center justify-center relative">
          <div 
            style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s ease-out' }}
            className="w-full h-full max-w-[700px] max-h-[400px]"
          >
            <svg viewBox="0 0 700 400" className="w-full h-full">
              {/* Traffic Flow Paths */}
              {/* Attacker -> Firewall (Red Flow) */}
              <path id="path-attacker-firewall" d="M 80,100 L 220,100" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray={animateFlow ? "5, 5" : "none"} strokeDashoffset="0" className="opacity-40" />
              {/* WAN -> Firewall (Blue Flow) */}
              <path id="path-internet-firewall" d="M 80,180 L 220,180" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray={animateFlow ? "5, 5" : "none"} strokeDashoffset="0" className="opacity-40" />
              
              {/* Firewall -> Web Gateway */}
              <path id="path-firewall-web" d="M 280,180 L 400,100" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray={animateFlow ? "4, 6" : "none"} className="opacity-50" />
              {/* Firewall -> Clients */}
              <path id="path-firewall-clients" d="M 280,180 L 400,260" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray={animateFlow ? "5, 5" : "none"} className="opacity-40" />

              {/* Web Gateway -> API server */}
              <path d="M 460,100 L 550,60" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray={animateFlow ? "4, 4" : "none"} className="opacity-40" />
              {/* Web Gateway -> Kubernetes */}
              <path d="M 460,100 L 550,140" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray={animateFlow ? "4, 4" : "none"} className="opacity-40" />
              
              {/* Kubernetes -> DB Node */}
              <path d="M 580,140 L 580,240" stroke="#3b82f6" strokeWidth="1.5" className="opacity-30" />
              {/* API -> DB Node */}
              <path d="M 610,60 L 610,240" stroke="#3b82f6" strokeWidth="1.5" className="opacity-30" />

              {/* Node Circles & Visual components */}
              
              {/* Attacker Node */}
              <g onClick={() => setSelectedNodeId('node-attacker')} className="cursor-pointer group">
                <circle cx="80" cy="100" r="24" className={getNodeColor(nodes[1].status) + " transition-all duration-300 stroke-[2] group-hover:stroke-red-500/60"} />
                <foreignObject x="64" y="84" width="32" height="32" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center text-red-500">
                    <UserX size={16} />
                  </div>
                </foreignObject>
                <text x="80" y="140" textAnchor="middle" fill="#64748b" className="text-[9px] font-mono font-semibold">ATTACKER</text>
              </g>

              {/* WAN Gateway */}
              <g onClick={() => setSelectedNodeId('node-internet')} className="cursor-pointer group">
                <circle cx="80" cy="180" r="24" className={getNodeColor(nodes[0].status) + " transition-all stroke-[2]"} />
                <foreignObject x="64" y="164" width="32" height="32" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center text-emerald-400">
                    <Globe size={16} />
                  </div>
                </foreignObject>
                <text x="80" y="220" textAnchor="middle" fill="#64748b" className="text-[9px] font-mono font-semibold">WAN GATEWAY</text>
              </g>

              {/* Firewall / Aegis IPS node */}
              <g onClick={() => setSelectedNodeId('node-firewall')} className="cursor-pointer group">
                <circle cx="250" cy="180" r="28" className={getNodeColor(nodes[2].status) + " stroke-2"} />
                <foreignObject x="234" y="164" width="32" height="32" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center text-blue-400">
                    <ShieldCheck size={18} />
                  </div>
                </foreignObject>
                <text x="250" y="225" textAnchor="middle" fill="#94a3b8" className="text-[10px] font-semibold font-mono">AEGIS FIREWALL</text>
              </g>

              {/* Web Server Gateway */}
              <g onClick={() => setSelectedNodeId('node-web')} className="cursor-pointer group">
                <circle cx="430" cy="100" r="24" className={getNodeColor(nodes[3].status) + " stroke-2"} />
                <foreignObject x="414" y="84" width="32" height="32" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center text-amber-500">
                    <Server size={16} />
                  </div>
                </foreignObject>
                <text x="430" y="140" textAnchor="middle" fill="#64748b" className="text-[9px] font-mono font-semibold">WEB GATEWAY</text>
              </g>

              {/* API app Server */}
              <g onClick={() => setSelectedNodeId('node-app')} className="cursor-pointer group">
                <circle cx="580" cy="60" r="22" className={getNodeColor(nodes[4].status) + " stroke-2"} />
                <foreignObject x="564" y="44" width="32" height="32" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Server size={14} />
                  </div>
                </foreignObject>
                <text x="580" y="95" textAnchor="middle" fill="#64748b" className="text-[9px] font-mono">API CORE</text>
              </g>

              {/* Kubernetes Node */}
              <g onClick={() => setSelectedNodeId('node-k8s')} className="cursor-pointer group">
                <circle cx="580" cy="140" r="22" className={getNodeColor(nodes[6].status) + " stroke-2"} />
                <foreignObject x="564" y="124" width="32" height="32" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center text-cyan-400">
                    <Layers size={14} />
                  </div>
                </foreignObject>
                <text x="580" y="175" textAnchor="middle" fill="#64748b" className="text-[9px] font-mono">K8S PODS</text>
              </g>

              {/* Database node */}
              <g onClick={() => setSelectedNodeId('node-db')} className="cursor-pointer group">
                <circle cx="580" cy="240" r="22" className={getNodeColor(nodes[5].status) + " stroke-2"} />
                <foreignObject x="564" y="224" width="32" height="32" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center text-blue-400">
                    <Database size={14} />
                  </div>
                </foreignObject>
                <text x="580" y="275" textAnchor="middle" fill="#64748b" className="text-[9px] font-mono">POSTGRES DB</text>
              </g>

              {/* Corporate Clients Subnet */}
              <g onClick={() => setSelectedNodeId('node-clients')} className="cursor-pointer group">
                <circle cx="430" cy="260" r="24" className={getNodeColor(nodes[7].status) + " stroke-2"} />
                <foreignObject x="414" y="244" width="32" height="32" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Laptop size={16} />
                  </div>
                </foreignObject>
                <text x="430" y="300" textAnchor="middle" fill="#64748b" className="text-[9px] font-mono font-semibold">LAN CLIENTS</text>
              </g>

            </svg>
          </div>
        </div>

      </div>

      {/* Selected Host Details Sidebar panel */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 h-[500px] flex flex-col justify-between">
        {selectedNode ? (
          <div className="space-y-5 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-900 pb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-500">
                  <Network size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100">{selectedNode.name}</h3>
                  <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{selectedNode.ip}</span>
                </div>
              </div>

              {/* Node metrics and descriptors */}
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">{selectedNode.description}</p>
                
                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono pt-2">
                  <div className="p-2.5 bg-slate-900/30 border border-slate-900 rounded-lg">
                    <span className="text-[9px] text-slate-500 block font-semibold uppercase leading-none">RECENT FLOWS</span>
                    <span className="text-slate-200 mt-1 block font-bold">{selectedNode.recentTraffic} pkts</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/30 border border-slate-900 rounded-lg">
                    <span className="text-[9px] text-slate-500 block font-semibold uppercase leading-none">THREATS PULSED</span>
                    <span className={`mt-1 block font-bold ${selectedNode.threatsLogged > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {selectedNode.threatsLogged} ALERTS
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg flex items-center justify-between text-xs select-none">
                  <span className="text-slate-400">VM Firewall Status:</span>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${
                    selectedNode.status === 'isolated' ? 'bg-red-950/20 text-red-400 border-red-500/20 animate-pulse' :
                    selectedNode.status === 'compromised' ? 'bg-orange-950/20 text-orange-400 border-orange-500/20' :
                    'bg-emerald-950/20 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {selectedNode.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Isolate Control button */}
            {selectedNode.id !== 'node-internet' && selectedNode.id !== 'node-firewall' && (
              <button
                onClick={() => handleIsolateNode(selectedNode.id)}
                className={`w-full py-2.5 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedNode.status === 'isolated'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                }`}
              >
                <ShieldAlert size={14} />
                <span>{selectedNode.status === 'isolated' ? 'Re-admit Node to LAN' : 'Quarantine Host / Isolate'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500 text-xs">Select any network topology node.</div>
        )}
      </div>

    </div>
  );
};
