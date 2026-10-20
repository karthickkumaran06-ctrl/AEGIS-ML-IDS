import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { 
  Terminal, 
  Play, 
  Radio, 
  Layers, 
  HelpCircle,
  Plus,
  Compass,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const SimulationLabView: React.FC = () => {
  const { token, stats, changeScenario, addNotification, refreshStats } = useSecurity();
  
  // Custom packet form variables
  const [srcIp, setSrcIp] = useState('198.51.100.22');
  const [destIp, setDestIp] = useState('10.0.1.15');
  const [protocol, setProtocol] = useState<'TCP' | 'UDP' | 'ICMP' | 'DNS' | 'HTTP'>('TCP');
  const [srcPort, setSrcPort] = useState(44211);
  const [destPort, setDestPort] = useState(80);
  const [payload, setPayload] = useState("POST /api/auth/login HTTP/1.1\\r\\n\\r\\nusername=admin&password=' OR 1=1 --");
  const [classification, setClassification] = useState<'Benign' | 'SQL Injection' | 'SYN Flood' | 'Port Scan' | 'Zero-Day Alpha' | 'Zero-Day Beta'>('SQL Injection');

  const [loading, setLoading] = useState(false);

  const scenarios = [
    { name: 'Normal', title: 'Normal Baseline Traffic', desc: 'Benign standard Nginx web pings, telemetry polls, and microservice queries.', activeColor: 'border-emerald-500 text-emerald-400' },
    { name: 'SQL Injection Burst', title: 'SQL Injection Campaign', desc: 'Deploys localized SQL syntax injection probes trying to dump schemas.', activeColor: 'border-blue-500 text-blue-400' },
    { name: 'SYN Flood', title: 'TCP SYN Storm (DDoS)', desc: 'Overflows gateway router ports with high density rate TCP SYN flags.', activeColor: 'border-orange-500 text-orange-400' },
    { name: 'Port Scan', title: 'Sequential Port Sweeps', desc: 'Sequential port sweeps mapped over VLAN nodes to profile open sockets.', activeColor: 'border-purple-500 text-purple-400' },
    { name: 'Zero-Day Discovery', title: 'Zero-Day RCE Exploit', desc: 'Simulates target deserializations payloads targetting Core API servers.', activeColor: 'border-red-500 text-red-400 font-bold' },
    { name: 'Mixed Attack Campaign', title: 'Multi-Vector Ingress Campaign', desc: 'Spawns mixed concurrent bursts of SQLi, SYN storms, and scanning queries.', activeColor: 'border-rose-600 text-rose-400' }
  ];

  const handleScenarioDeploy = async (scenName: string) => {
    await changeScenario(scenName);
  };

  const handleCustomInject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/simulation/custom-packet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sourceIp: srcIp,
          destIp,
          protocol,
          sourcePort: srcPort,
          destPort,
          payload,
          classification
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`SANDBOX SUCCESS: Injected customized forged frame [${data.data.id}] into routing gateways.`);
        refreshStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      
      {/* Predefined scenarios list column */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Predefined Security Scenarios</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-4">Deploy predefined campaign profiles across active network adapters to evaluate model detection capabilities.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scenarios.map(sc => {
              const isActive = stats.activeScenario === sc.name;
              return (
                <div 
                  key={sc.name}
                  onClick={() => handleScenarioDeploy(sc.name)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isActive 
                      ? `bg-slate-900/60 shadow-lg border-blue-500/40 text-slate-200` 
                      : 'bg-slate-900/20 border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-200">{sc.title}</span>
                    {isActive && (
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950/20 text-blue-400 border border-blue-500/10 animate-pulse">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2.5 leading-relaxed">{sc.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Manual Packet Sandbox Constructor */}
      <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4 flex flex-col justify-between h-[450px]">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-500 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Packet Injector Sandbox</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Forge raw packet attributes and trigger real-time Snort & meta-learning validations.</p>
        </div>

        <form onSubmit={handleCustomInject} className="space-y-3.5 flex-1 overflow-y-auto pr-1 py-1 my-2 scrollbar-thin text-left">
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">SOURCE IP</label>
              <input
                type="text"
                required
                value={srcIp}
                onChange={(e) => setSrcIp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-300 font-mono rounded-lg py-1.5 px-3 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">DESTINATION IP</label>
              <input
                type="text"
                required
                value={destIp}
                onChange={(e) => setDestIp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-300 font-mono rounded-lg py-1.5 px-3 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">PROTOCOL</label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-300 rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
              >
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
                <option value="ICMP">ICMP</option>
                <option value="HTTP">HTTP</option>
                <option value="DNS">DNS</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">PORT TARGET</label>
              <input
                type="number"
                required
                value={destPort}
                onChange={(e) => setDestPort(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-300 font-mono rounded-lg py-1.5 px-3 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">MOCK CLASSIFICATION LABEL</label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-300 rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
            >
              <option value="Benign">Benign (Safe)</option>
              <option value="SQL Injection">SQL Injection</option>
              <option value="SYN Flood">SYN Flood</option>
              <option value="Port Scan">Port Scan</option>
              <option value="Zero-Day Alpha">Zero-Day Alpha (In-Memory RCE)</option>
              <option value="Zero-Day Beta">Zero-Day Beta (DNS Tunnel)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">CUSTOM DATA PAYLOAD</label>
            <textarea
              required
              rows={2}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-300 font-mono rounded-lg py-1.5 px-3 focus:outline-none resize-none"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
          >
            <Plus size={13} />
            <span>{loading ? 'Transmitting forged packet...' : 'Inject Forged Packet'}</span>
          </button>
        </form>
      </div>

    </div>
  );
};
