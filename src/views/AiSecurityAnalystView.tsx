import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';
import { AIAnalysis } from '../types';
import { 
  Bot, 
  Search, 
  Terminal, 
  History, 
  CheckCircle, 
  HelpCircle,
  Copy,
  Sparkles,
  Zap,
  RefreshCw,
  ServerCrash
} from 'lucide-react';

export const AiSecurityAnalystView: React.FC = () => {
  const { token, packets, alerts, addNotification } = useSecurity();
  const location = useLocation();

  const [targetId, setTargetId] = useState('');
  const [targetType, setTargetType] = useState<'packet' | 'alert'>('packet');

  const [activeReport, setActiveReport] = useState<AIAnalysis | null>(null);
  const [historyReports, setHistoryReports] = useState<AIAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Pre-load from router state if available
  useEffect(() => {
    if (location.state && location.state.refId && location.state.refType) {
      setTargetId(location.state.refId);
      setTargetType(location.state.refType);
      
      // Auto run analysis immediately
      triggerForensicAnalysis(location.state.refId, location.state.refType);
    } else if (packets.length > 0 && !targetId) {
      setTargetId(packets[0].id);
      setTargetType('packet');
    }
  }, [location.state, packets]);

  const fetchHistory = async () => {
    try {
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/ai/history', { headers });
      const data = await res.json();
      if (data.success) {
        setHistoryReports(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const triggerForensicAnalysis = async (id: string, type: 'packet' | 'alert') => {
    setLoading(true);
    setIsOffline(false);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ refId: id, refType: type })
      });

      const data = await res.json();
      if (data.success) {
        setActiveReport(data.data);
        if (data.isOfflineMode) {
          setIsOffline(true);
          addNotification('AI SECURITY ANALYST: Core offline. Spawned safe local forensic database.');
        } else {
          addNotification('AI SECURITY ANALYST: Completed secure Gemini intelligence audit.');
        }
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;
    triggerForensicAnalysis(targetId, targetType);
  };

  const handleCopy = () => {
    if (!activeReport) return;
    navigator.clipboard.writeText(JSON.stringify(activeReport, null, 2));
    addNotification('Forensic report text copied to clipboard buffer.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 select-none">
      
      {/* Left Forensics Selection & History panel */}
      <div className="space-y-6 lg:col-span-1">
        
        {/* Selector Form */}
        <form onSubmit={handleRunAnalysis} className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
            <Bot className="w-5 h-5 text-blue-500 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Initialize Forensic</h3>
          </div>

          {/* Type selector */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">TARGET TYPE</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setTargetType('packet'); if (packets.length > 0) setTargetId(packets[0].id); }}
                className={`py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                  targetType === 'packet'
                    ? 'bg-blue-600/10 border-blue-500/20 text-blue-400 font-bold'
                    : 'bg-slate-900/40 border-slate-900 text-slate-500 hover:text-slate-300'
                }`}
              >
                Packets
              </button>
              <button
                type="button"
                onClick={() => { setTargetType('alert'); if (alerts.length > 0) setTargetId(alerts[0].id); }}
                className={`py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                  targetType === 'alert'
                    ? 'bg-blue-600/10 border-blue-500/20 text-blue-400 font-bold'
                    : 'bg-slate-900/40 border-slate-900 text-slate-500 hover:text-slate-300'
                }`}
              >
                Alerts
              </button>
            </div>
          </div>

          {/* Target ID Select list */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">SELECT COMPONENT ID</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-900 text-xs text-slate-300 rounded-lg py-2 px-3 focus:outline-none"
            >
              {targetType === 'packet' ? (
                packets.map(p => (
                  <option key={p.id} value={p.id}>{p.id} · {p.classification}</option>
                ))
              ) : (
                alerts.map(a => (
                  <option key={a.id} value={a.id}>{a.id} · {a.attackType}</option>
                ))
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !targetId}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-900 text-white disabled:text-slate-500 font-semibold text-xs rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? <RefreshCw className="animate-spin" size={13} /> : <Zap size={13} />}
            <span>{loading ? 'Analyzing with AI...' : 'Dispatch Forensic AI'}</span>
          </button>
        </form>

        {/* History of generated logs */}
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4 h-64 flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Analysis Registry</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-1 scrollbar-thin">
            {historyReports.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No forensic reviews cached yet.</p>
            ) : (
              historyReports.map(rep => (
                <div 
                  key={rep.id}
                  onClick={() => setActiveReport(rep)}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    activeReport?.id === rep.id
                      ? 'bg-blue-600/10 border-blue-500/20 text-slate-200'
                      : 'bg-slate-900/20 border-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-bold truncate">{rep.classification}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">{rep.refId} · {new Date(rep.timestamp).toLocaleTimeString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Right Forensics Detail Report Viewport */}
      <div className="lg:col-span-3 bg-slate-950 border border-slate-900 rounded-xl p-6 h-[510px] flex flex-col justify-between overflow-hidden relative">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="animate-spin text-blue-400 h-10 w-10" />
            <div className="text-center">
              <h4 className="text-xs font-bold text-slate-300">DISPATCHING AEGIS FORENSICS CORE...</h4>
              <p className="text-[10px] text-slate-500 mt-1">Ingesting binary network stream and cross-normalizing clusters metrics...</p>
            </div>
          </div>
        ) : activeReport ? (
          <div className="h-full flex flex-col justify-between overflow-hidden">
            
            {/* Header info bar */}
            <div className="border-b border-slate-900 pb-3 flex justify-between items-start shrink-0">
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase">Aegis AI Audit File: {activeReport.id}</span>
                <h3 className="text-sm font-bold text-slate-200 mt-1">{activeReport.classification}</h3>
              </div>
              <div className="flex gap-2">
                {isOffline && (
                  <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 animate-pulse">
                    DEMO OFFLINE GRAPHS
                  </span>
                )}
                <button 
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-300 cursor-pointer"
                  title="Copy Report JSON"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Scrollable structured findings content */}
            <div className="flex-1 overflow-y-auto space-y-5 my-4 pr-2 scrollbar-thin">
              
              {/* Executive summary block */}
              <div className="p-4 bg-blue-600/5 border-l-2 border-blue-500 rounded-r-xl space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider text-blue-400 font-bold block">1. Executive Summary Findings</span>
                <p className="text-xs text-slate-300 leading-relaxed select-text font-medium">{activeReport.summary}</p>
              </div>

              {/* Behavior & Evidence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">2. Ingress Forensic Evidence</span>
                  <p className="text-xs text-slate-300 leading-relaxed select-text">{activeReport.evidence}</p>
                </div>
                <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">3. Attacker Behavioral Model</span>
                  <p className="text-xs text-slate-300 leading-relaxed select-text">{activeReport.behavior}</p>
                </div>
              </div>

              {/* Detection explanation & risk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">4. Threat Detection Logic</span>
                  <p className="text-xs text-slate-300 leading-relaxed select-text">{activeReport.explanation}</p>
                </div>
                <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">5. Impact & Calculated Damage Risk</span>
                  <p className="text-xs text-slate-300 leading-relaxed select-text">{activeReport.risk}</p>
                </div>
              </div>

              {/* Code Snort firewall recommendation rule */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">6. Recommended Snort Signature syntax</span>
                <pre className="bg-slate-950 border border-slate-900 text-cyan-400 p-3.5 rounded-lg font-mono text-[10px] overflow-x-auto select-text">
                  {activeReport.ruleRecommendation}
                </pre>
              </div>

              {/* MLOps instructions */}
              {activeReport.metaLearningRecommendation && (
                <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">7. Meta-Learning MLOps Recommendation</span>
                  <p className="text-xs text-slate-300 leading-relaxed select-text">{activeReport.metaLearningRecommendation}</p>
                </div>
              )}

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-2">
            <Bot size={36} className="text-slate-600 animate-bounce" />
            <div className="text-center max-w-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase">NO SELECTED FINDINGS REPORT</h4>
              <p className="text-[10px] text-slate-500 mt-1">Select a packet or alert target from the list and dispatch AI to generate full forensic audits.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
