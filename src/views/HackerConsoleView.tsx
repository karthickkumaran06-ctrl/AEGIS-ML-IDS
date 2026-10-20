import React, { useState, useEffect, useRef } from 'react';
import {
  Skull,
  Terminal,
  Usb,
  Lock,
  Wifi,
  KeyRound,
  AlertTriangle,
  ShieldOff,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  Server,
  Activity,
  Zap,
  Globe,
  CheckCircle
} from 'lucide-react';

interface AttackLog {
  id: string;
  timestamp: string;
  type: string;
  target: string;
  status: 'Launched' | 'Detected' | 'Blocked' | 'Evaded';
  payload?: string;
}

type AttackType =
  | 'brute_force'
  | 'sql_injection'
  | 'usb_drop'
  | 'port_scan'
  | 'syn_flood'
  | 'zero_day';

const ATTACKER_PROFILES = [
  { id: 'anon', label: 'Anonymous Script Kiddie', desc: 'Basic tool-based attacks, no obfuscation', ip: '203.0.113.99' },
  { id: 'apt', label: 'APT Nation-State Actor', desc: 'Advanced persistent threat, stealthy multi-vector', ip: '185.22.174.15' },
  { id: 'insider', label: 'Malicious Insider', desc: 'Authorized access, privilege escalation', ip: '10.0.1.55' },
  { id: 'researcher', label: 'Security Researcher', desc: 'Ethical pen-tester documenting vulnerabilities', ip: '198.51.100.99' },
];

export const HackerConsoleView: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [authError, setAuthError] = useState('');

  const [selectedProfile, setSelectedProfile] = useState(ATTACKER_PROFILES[0]);
  const [attackType, setAttackType] = useState<AttackType>('brute_force');
  const [targetIp, setTargetIp] = useState('10.0.1.15');
  const [targetPort, setTargetPort] = useState(80);
  const [customPayload, setCustomPayload] = useState('');
  const [logs, setLogs] = useState<AttackLog[]>([]);
  const [launching, setLaunching] = useState(false);
  const [termOutput, setTermOutput] = useState<string[]>([]);
  const termRef = useRef<HTMLDivElement>(null);

  // Scroll terminal to bottom
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [termOutput]);

  // Hacker portal access code: "REDTEAM2026"
  const handleAuth = () => {
    if (accessCode.trim().toUpperCase() === 'REDTEAM2026') {
      setAuthenticated(true);
      setTermOutput([
        '> AEGIS RED TEAM PORTAL v2.0',
        '> Access granted. Welcome, Operator.',
        '> WARNING: All actions are monitored and logged by Blue Team.',
        '> Type "help" to see available attack modules.',
        '> ─────────────────────────────────────────',
      ]);
    } else {
      setAuthError('Invalid red team access token. This attempt has been logged.');
    }
  };

  const addTermLine = (line: string) => {
    setTermOutput(prev => [...prev, line]);
  };

  const buildAttackPayload = (): string => {
    if (customPayload) return customPayload;
    const payloads: Record<AttackType, string> = {
      brute_force: `POST /api/auth/login {"email":"admin@aegis.io","password":"<wordlist>"}`,
      sql_injection: `GET /items?id=' UNION SELECT username,passwordHash FROM users--`,
      usb_drop: `[USB-DROP] Autorun malware payload: /media/usb0/autorun.sh`,
      port_scan: `nmap -sS -p 1-65535 -T4 ${targetIp}`,
      syn_flood: `hping3 --flood -S -p ${targetPort} ${targetIp}`,
      zero_day: `POST /internal/serializer {"obj":"rO0ABXNyADdjb20uYWVnaXMuaWRz..."}`,
    };
    return payloads[attackType];
  };

  const launchAttack = async () => {
    setLaunching(true);
    const payload = buildAttackPayload();

    addTermLine('');
    addTermLine(`> [${new Date().toLocaleTimeString()}] Launching attack: ${attackType.toUpperCase().replace('_', ' ')}`);
    addTermLine(`> Profile: ${selectedProfile.label} (${selectedProfile.ip})`);
    addTermLine(`> Target: ${targetIp}:${targetPort}`);
    addTermLine(`> Payload: ${payload.substring(0, 80)}...`);
    addTermLine(`> Transmitting...`);

    try {
      const res = await fetch('/api/hacker/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attackType,
          targetIp,
          targetPort,
          payload,
          sourceIp: selectedProfile.ip,
          profileId: selectedProfile.id,
        }),
      });
      const json = await res.json();

      if (json.success) {
        const result = json.data;
        addTermLine(`> Status: ${result.status}`);
        addTermLine(`> Detection: ${result.detected ? '⚠ DETECTED by AEGIS' : '✓ Evaded detection'}`);
        addTermLine(`> Confidence: ${result.confidence}%`);
        addTermLine(`> Response: ${result.responseMsg}`);

        const newLog: AttackLog = {
          id: `atk-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: attackType,
          target: `${targetIp}:${targetPort}`,
          status: result.detected ? (result.blocked ? 'Blocked' : 'Detected') : 'Evaded',
          payload: payload.substring(0, 100),
        };
        setLogs(prev => [newLog, ...prev]);
      }
    } catch (err) {
      addTermLine(`> [ERROR] Attack transmission failed: ${err}`);
    } finally {
      setLaunching(false);
    }
  };

  const handleUsbSimulate = async () => {
    setLaunching(true);
    addTermLine('');
    addTermLine(`> [${new Date().toLocaleTimeString()}] Simulating USB device insertion...`);
    addTermLine(`> Device: Sandisk Ultra 32GB (Spoofed)`);
    addTermLine(`> Serial: SN-ROGUE-0x4F2C`);

    try {
      const res = await fetch('/api/hacker/usb-insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: 'SanDisk Ultra 32GB', vendor: 'SanDisk Corp (Spoofed)', serial: 'SN-ROGUE-0x4F2C' }),
      });
      const json = await res.json();
      if (json.success) {
        addTermLine(`> USB inserted. Status: ${json.data.status}`);
        addTermLine(json.data.detected ? `> ⚠ AEGIS USB Monitor flagged this device.` : `> ✓ USB appears trusted. Not flagged.`);
        const newLog: AttackLog = {
          id: `usb-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'usb_drop',
          target: 'System USB Bus',
          status: json.data.detected ? 'Detected' : 'Evaded',
          payload: 'SanDisk Ultra 32GB (Spoofed) — SN-ROGUE-0x4F2C',
        };
        setLogs(prev => [newLog, ...prev]);
      }
    } finally {
      setLaunching(false);
    }
  };

  // ── Login Gate ──────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center select-none">
        <div className="w-full max-w-md space-y-6">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-xl bg-red-950/40 border border-red-500/20 flex items-center justify-center">
              <Skull className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-red-400 tracking-tight font-mono">RED TEAM CONSOLE</h1>
              <p className="text-[11px] text-slate-500 mt-1">
                Authorized penetration testing portal — Separate attacker workspace
              </p>
              <p className="text-[10px] text-slate-600 mt-1">
                All activity is monitored and fed to the Blue Team IDS in real-time
              </p>
            </div>
          </div>

          <div className="bg-slate-950 border border-red-500/10 rounded-2xl p-6 space-y-4">
            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-mono">
                ⚠ {authError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Red Team Access Token
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-red-500/50" />
                <input
                  type={showCode ? 'text' : 'password'}
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()}
                  placeholder="Enter team access token..."
                  className="w-full bg-slate-900/60 border border-red-500/10 focus:border-red-500/40 rounded-lg py-2.5 pl-10 pr-10 text-xs text-slate-200 font-mono placeholder-slate-700 focus:outline-none"
                />
                <button type="button" onClick={() => setShowCode(!showCode)} className="absolute right-3 top-3 text-slate-600 hover:text-slate-400 cursor-pointer">
                  {showCode ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleAuth}
              className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Authenticate Red Team Operator
            </button>

            <div className="pt-3 border-t border-slate-900/60">
              <p className="text-[10px] text-slate-600 text-center">
                Demo token: <span className="font-mono text-red-500/70">REDTEAM2026</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated Red Team Console ─────────────────────────────────────────
  const statusColor = (s: AttackLog['status']) => {
    if (s === 'Blocked') return 'text-red-400 bg-red-950/20 border-red-500/20';
    if (s === 'Detected') return 'text-amber-400 bg-amber-950/20 border-amber-500/20';
    if (s === 'Evaded') return 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20';
    return 'text-blue-400 bg-blue-950/20 border-blue-500/20';
  };

  return (
    <div className="space-y-6 select-none">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2 font-mono">
            <Skull className="w-4 h-4" />
            Red Team Operator Console
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Profile: <span className="text-red-400/70">{selectedProfile.label}</span> · IP: <span className="font-mono text-slate-400">{selectedProfile.ip}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-950/20 border border-red-500/20 px-3 py-1.5 rounded-lg font-bold font-mono animate-pulse">
            <Activity size={10} /> LIVE ATTACK SURFACE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Attack Control Panel */}
        <div className="lg:col-span-1 space-y-4">

          {/* Attacker Profile */}
          <div className="bg-slate-950 border border-red-500/10 rounded-xl p-4 space-y-3">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Skull size={10} className="text-red-400" /> Attacker Profile
            </h3>
            {ATTACKER_PROFILES.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProfile(p)}
                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedProfile.id === p.id
                    ? 'border-red-500/30 bg-red-950/20 text-slate-200'
                    : 'border-slate-900 hover:border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                <p className="text-xs font-semibold">{p.label}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{p.desc}</p>
                <p className="text-[9px] text-red-500/60 font-mono mt-1">{p.ip}</p>
              </button>
            ))}
          </div>

          {/* Attack Type */}
          <div className="bg-slate-950 border border-red-500/10 rounded-xl p-4 space-y-3">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Zap size={10} className="text-amber-400" /> Attack Module
            </h3>
            {([
              { id: 'brute_force', label: 'Brute Force Login', icon: Lock },
              { id: 'sql_injection', label: 'SQL Injection', icon: Terminal },
              { id: 'port_scan', label: 'Port Scan Sweep', icon: Globe },
              { id: 'syn_flood', label: 'SYN Flood DDoS', icon: Activity },
              { id: 'zero_day', label: 'Zero-Day RCE', icon: Skull },
            ] as { id: AttackType; label: string; icon: any }[]).map(at => {
              const Icon = at.icon;
              return (
                <button
                  key={at.id}
                  onClick={() => setAttackType(at.id)}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    attackType === at.id
                      ? 'border-red-500/30 bg-red-950/20 text-red-300'
                      : 'border-slate-900 hover:border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={12} />
                  {at.label}
                </button>
              );
            })}
          </div>

          {/* Target + Launch */}
          <div className="bg-slate-950 border border-red-500/10 rounded-xl p-4 space-y-3">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Server size={10} className="text-blue-400" /> Target Configuration
            </h3>
            <div className="space-y-2">
              <div>
                <label className="text-[9px] text-slate-600 uppercase font-bold block mb-1">Target IP</label>
                <input
                  value={targetIp}
                  onChange={e => setTargetIp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono rounded-lg py-1.5 px-3 focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-600 uppercase font-bold block mb-1">Target Port</label>
                <input
                  type="number"
                  value={targetPort}
                  onChange={e => setTargetPort(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono rounded-lg py-1.5 px-3 focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-600 uppercase font-bold block mb-1">Custom Payload (optional)</label>
                <textarea
                  rows={2}
                  value={customPayload}
                  onChange={e => setCustomPayload(e.target.value)}
                  placeholder="Leave empty for default payload..."
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono rounded-lg py-1.5 px-3 focus:outline-none focus:border-red-500/30 resize-none"
                />
              </div>
            </div>

            <button
              onClick={launchAttack}
              disabled={launching}
              className="w-full py-2.5 bg-red-700 hover:bg-red-600 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.2)]"
            >
              <Send size={12} />
              {launching ? 'Transmitting Attack...' : 'Launch Attack Vector'}
            </button>

            <button
              onClick={handleUsbSimulate}
              disabled={launching}
              className="w-full py-2 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/20 text-purple-300 font-bold text-xs rounded-lg cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Usb size={12} />
              Simulate USB Drop
            </button>
          </div>
        </div>

        {/* Right: Terminal + Logs */}
        <div className="lg:col-span-2 space-y-4">

          {/* Terminal Output */}
          <div className="bg-black border border-red-500/10 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border-b border-red-500/10">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-500 ml-2 font-mono">aegis-redteam-shell — {selectedProfile.ip}</span>
            </div>
            <div
              ref={termRef}
              className="p-4 h-72 overflow-y-auto font-mono text-[11px] text-emerald-400 space-y-0.5 scrollbar-thin"
            >
              {termOutput.map((line, i) => (
                <div key={i} className={`leading-relaxed ${line.includes('⚠') || line.includes('DETECTED') ? 'text-amber-400' : line.includes('✓') || line.includes('Evaded') ? 'text-emerald-300' : line.includes('[ERROR]') ? 'text-red-400' : ''}`}>
                  {line}
                </div>
              ))}
              {launching && (
                <div className="text-amber-400 animate-pulse">{'>'} ▊</div>
              )}
            </div>
          </div>

          {/* Attack History */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <ShieldOff size={10} className="text-red-400" /> Attack History ({logs.length})
              </h3>
              <button onClick={() => setLogs([])} className="text-[9px] text-slate-600 hover:text-slate-400 cursor-pointer">Clear</button>
            </div>

            {logs.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-8 font-mono">No attacks launched yet. Blue Team is dormant.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start justify-between gap-3 p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300 font-mono">{log.type.replace('_', ' ').toUpperCase()}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusColor(log.status)}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-mono">{log.target}</p>
                      {log.payload && <p className="text-[9px] text-slate-600 font-mono truncate max-w-xs">{log.payload}</p>}
                    </div>
                    <span className="text-[9px] text-slate-600 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
