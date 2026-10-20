import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Packet } from '../types';
import { X, Cpu, SearchCode, ShieldAlert, FileCode, Plus, UserPlus, Trash, Shield, ArrowUpRight, Copy, Terminal, Bot } from 'lucide-react';

interface PacketDrawerProps {
  packet: Packet;
  onClose: () => void;
}

export const PacketDrawer: React.FC<PacketDrawerProps> = ({ packet, onClose }) => {
  const { token, addNotification, refreshStats } = useSecurity();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  // Generate Hexadecimal formatted representation of simulated payload
  const formatPayloadToHex = (str: string) => {
    const hexArr: string[] = [];
    const asciiArr: string[] = [];
    const lines: string[] = [];

    // Simple padding for representation
    const fullStr = str.padEnd(64, ' ');

    for (let i = 0; i < Math.min(fullStr.length, 128); i += 8) {
      const chunk = fullStr.substring(i, i + 8);
      const hex = Array.from(chunk)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(' ');
      
      const ascii = Array.from(chunk)
        .map(char => (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126 ? char : '.'))
        .join('');

      const offset = i.toString(16).padStart(4, '0');
      lines.push(`${offset}  ${hex.padEnd(23, ' ')}  |${ascii}|`);
    }

    return lines.join('\n');
  };

  const handleBlockSource = async () => {
    setLoading('blocking');
    try {
      // Create custom block rule
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `Auto-Block ${packet.sourceIp}`,
          description: `Firewall blocker generated for active threat mitigation of ${packet.classification}`,
          category: 'Firewall Policy',
          severity: 'High',
          protocol: packet.protocol === 'HTTP' ? 'TCP' : packet.protocol,
          pattern: packet.sourceIp,
          action: 'Block'
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`FIREWALL POLICY APPLIED: Blocked source IP ${packet.sourceIp} permanently.`);
        refreshStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const handleCreateRule = async () => {
    setLoading('rule');
    try {
      const keyword = packet.classification === 'SQL Injection' ? 'UNION SELECT' : packet.protocol;
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `Extracted ${packet.classification} Rule`,
          description: `YARA/Snort signature pulled from packet ${packet.id}`,
          category: 'Extracted Signatures',
          severity: packet.severity,
          protocol: packet.protocol === 'HTTP' ? 'TCP' : 'ANY',
          pattern: keyword,
          action: 'Alert'
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`SIGNATURE EXTRACED: New detection rule created for keyword "${keyword}"`);
        navigate('/rules');
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const handleCreateIncident = async () => {
    setLoading('incident');
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Threat containment: [${packet.classification}] from source ${packet.sourceIp}`,
          description: `Incident spawned for deep forensics audit of source payload: "${packet.payload.substring(0, 80)}..."`,
          severity: packet.severity === 'Critical' ? 'Critical' : 'High',
          affectedAssets: [packet.destIp],
          sourceIps: [packet.sourceIp],
          relatedAlertIds: []
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`INCIDENT ACTION RECORDED: Spawned incident ${data.data.id} for further mitigation.`);
        navigate('/incidents');
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const handleAiAnalysis = () => {
    navigate('/ai-analyst', { state: { refId: packet.id, refType: 'packet' } });
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(packet, null, 2));
    addNotification('Packet details copied to clipboard buffer.');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop overlay scrim */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      ></div>

      {/* Drawer content */}
      <div className="relative w-full max-w-lg bg-slate-950 border-l border-slate-900 h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="h-16 border-b border-slate-900 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-slate-100 text-sm font-mono">{packet.id}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Classification Banner */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            packet.classification === 'Benign' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : packet.severity === 'Critical'
              ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[inset_0_1px_10px_rgba(239,68,68,0.05)]'
              : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
          }`}>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Classification Profile</span>
            <span className="text-lg font-bold mt-1">{packet.classification}</span>
            <div className="flex gap-2 items-center mt-3 text-xs opacity-80">
              <span className="font-semibold">Action Outcome:</span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold border ${
                packet.action === 'Block' ? 'bg-red-950/20 text-red-400 border-red-500/20' :
                packet.action === 'Alert' ? 'bg-orange-950/20 text-orange-400 border-orange-500/20' :
                'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {packet.action}
              </span>
            </div>
          </div>

          {/* KPI Metadata grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-900 select-none">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block">SOURCE NODE</span>
              <span className="text-xs font-semibold text-slate-200 font-mono mt-1 block">{packet.sourceIp}</span>
              <span className="text-[10px] text-slate-500 block">Port: {packet.sourcePort}</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-900 select-none">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block">DESTINATION NODE</span>
              <span className="text-xs font-semibold text-slate-200 font-mono mt-1 block">{packet.destIp}</span>
              <span className="text-[10px] text-slate-500 block">Port: {packet.destPort}</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-900 select-none">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block">PROTOCOL</span>
              <span className="text-xs font-semibold text-slate-200 font-mono mt-1 block">{packet.protocol}</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-900 select-none">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block">FRAME SIZE</span>
              <span className="text-xs font-semibold text-slate-200 font-mono mt-1 block">{packet.size} bytes</span>
            </div>
          </div>

          {/* Engine Scorecards */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Engine Analysis Scorecards</h4>
            
            <div className="p-3 rounded-lg border border-slate-900 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SearchCode className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Classical Signature Engine</p>
                  <p className="text-[10px] text-slate-500">
                    {packet.classicalIds.detected ? `Matched: ${packet.classicalIds.ruleId}` : 'No signatures matched'}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                packet.classicalIds.detected ? 'bg-red-500/10 text-red-400' : 'bg-slate-900 text-slate-500'
              }`}>
                {packet.classicalIds.detected ? 'MATCHED' : 'BYPASSED'}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-900 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Adaptive Meta-Learning Engine</p>
                  <p className="text-[10px] text-slate-500">
                    Confidence score: {packet.metaIds.confidence}% · Cluster label: {packet.metaIds.label}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                packet.metaIds.detected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-500'
              }`}>
                {packet.metaIds.detected ? 'DETECTED' : 'BENIGN'}
              </span>
            </div>
          </div>

          {/* Payload Formatter terminal view */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Diagnostic Raw Hex Payload</h4>
              <button 
                onClick={handleCopy}
                className="p-1 hover:bg-slate-900 text-slate-500 hover:text-slate-300 rounded cursor-pointer"
                title="Copy Packet JSON"
              >
                <Copy size={14} />
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-900 text-slate-300 rounded-lg p-4 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-44 scrollbar-thin select-text">
              {formatPayloadToHex(packet.payload)}
            </pre>
          </div>
        </div>

        {/* Action Panel Footer */}
        <div className="p-6 border-t border-slate-900 bg-slate-950/80 sticky bottom-0 grid grid-cols-2 gap-3 shrink-0">
          <button
            onClick={handleAiAnalysis}
            className="col-span-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)] cursor-pointer"
          >
            <Bot size={15} />
            <span>AI Forensic Analysis</span>
          </button>

          <button
            onClick={handleCreateIncident}
            disabled={loading === 'incident'}
            className="py-2.5 rounded-lg border border-slate-900 hover:bg-slate-900 text-slate-300 hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus size={14} />
            <span>{loading === 'incident' ? 'Creating...' : 'File Incident'}</span>
          </button>

          <button
            onClick={handleCreateRule}
            disabled={loading === 'rule' || packet.classification === 'Benign'}
            className="py-2.5 rounded-lg border border-slate-900 hover:bg-slate-900 text-slate-300 hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <FileCode size={14} />
            <span>{loading === 'rule' ? 'Extracting...' : 'Extract Rules'}</span>
          </button>

          <button
            onClick={handleBlockSource}
            disabled={loading === 'blocking' || packet.classification === 'Benign'}
            className="col-span-2 py-2.5 rounded-lg border border-red-950 hover:bg-red-900/20 text-red-400 hover:text-red-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <ShieldAlert size={14} />
            <span>{loading === 'blocking' ? 'Applying Block...' : `Block Hacker IP (${packet.sourceIp})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
