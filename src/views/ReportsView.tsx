import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { FileText, Download, ShieldCheck, RefreshCw, Printer, CheckCircle } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { token, addNotification } = useSecurity();
  const [reportType, setReportType] = useState('Daily Security Summary');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: reportType })
      });

      const data = await res.json();
      if (data.success) {
        setReport(data.data);
        addNotification(`REPORTS GENERATOR: Compiled security report [${reportType}].`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Selector console row */}
      <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            disabled={loading}
            className="w-full bg-slate-900 border border-slate-900 text-xs text-slate-300 rounded-lg py-2 px-3 focus:outline-none cursor-pointer"
          >
            <option value="Daily Security Summary">Daily Security Summary</option>
            <option value="Zero-Day Detection Report">Zero-Day Detection audit</option>
            <option value="Model Performance Report">Model MLOps Performance Report</option>
            <option value="Incident Response Containment">Incident Containment Report</option>
          </select>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-colors cursor-pointer flex items-center gap-1.5"
        >
          {loading ? <RefreshCw className="animate-spin" size={13} /> : <FileText size={13} />}
          <span>Compile Diagnostic Report</span>
        </button>
      </div>

      {/* Report Display */}
      {report ? (
        <div className="bg-slate-950 border border-slate-900 rounded-xl p-8 space-y-6 shadow-2xl relative max-w-3xl mx-auto border-t-4 border-t-blue-500 print:bg-white print:text-black print:p-0">
          
          {/* Print controller overlay */}
          <div className="absolute top-4 right-4 flex gap-2 print:hidden">
            <button 
              onClick={handlePrint}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Print compliance document"
            >
              <Printer size={14} />
            </button>
          </div>

          {/* Letterhead */}
          <div className="flex justify-between items-start border-b border-slate-900 pb-4">
            <div>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">AEGIS COMPLIANCE AUDIT SCHEMA</span>
              <h2 className="text-base font-bold text-slate-100 mt-1">{report.title}</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">Ref ID: {report.id} · Date: {new Date(report.createdDate).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-300">AEGIS ML PLATFORM</span>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Operator: {report.generatedBy}</p>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
              <span className="text-[8px] text-slate-500 block font-semibold uppercase leading-none">FRAMES PARSED</span>
              <span className="text-base font-bold font-mono tracking-tight text-slate-100 mt-1 block">{report.kpis.packetsAnalyzed}</span>
            </div>
            <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
              <span className="text-[8px] text-slate-500 block font-semibold uppercase leading-none">THREATS DETECTED</span>
              <span className="text-base font-bold font-mono tracking-tight text-red-400 mt-1 block">{report.kpis.threatsDetected}</span>
            </div>
            <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
              <span className="text-[8px] text-slate-500 block font-semibold uppercase leading-none">CRITICAL INCIDENTS</span>
              <span className="text-base font-bold font-mono tracking-tight text-orange-400 mt-1 block">{report.kpis.criticalEvents}</span>
            </div>
            <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
              <span className="text-[8px] text-slate-500 block font-semibold uppercase leading-none">DEFENSE POLICY</span>
              <span className="text-[10px] font-bold text-emerald-400 mt-1.5 block">{report.kpis.defenseStatus}</span>
            </div>
          </div>

          {/* Core breakdown threat catalog list */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-900 pb-1.5">Model Vector Catalogings</h4>
            <div className="space-y-1.5 text-xs">
              {report.threatDistribution.map((t: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-900/20 border border-slate-900 rounded-lg font-mono">
                  <div>
                    <span className="font-bold text-slate-200">{t.name}</span>
                    <span className="text-[9px] text-slate-500 px-2">({t.severity} Severity)</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-semibold">{t.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active firewall blacklists */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Active Firewall Blacklist VM Nodes</h4>
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
              {report.activeBlockedIps.length === 0 ? (
                <span className="text-slate-500">No IPs currently isolated on WAN Gateway policies.</span>
              ) : (
                report.activeBlockedIps.map((ip: string) => (
                  <span key={ip} className="px-2.5 py-0.5 rounded bg-red-950/20 text-red-400 border border-red-500/10 font-bold">
                    {ip}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Bulleted security actions recommendations */}
          <div className="p-4 bg-emerald-500/5 border-l-2 border-emerald-500 rounded-r-xl space-y-1.5">
            <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">Compliance Mitigation Guidelines</span>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 select-text">
              <li>Deploy automatic support shots adaptations whenever novel deserialization bypass triggers are pulsed.</li>
              <li>Re-index WAN firewall proxy limits to drops recursive DNS queries exfiltrations blocks.</li>
              <li>Perform deep forensics containment on localized Application server instances targetted by RCE.</li>
            </ul>
          </div>

        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-900 p-12 rounded-xl text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
          <FileText size={32} className="text-slate-700 animate-bounce" />
          <h4 className="font-bold text-slate-400 uppercase">NO REPORT LOGPILED</h4>
          <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">Select a diagnostic target schema above and hit Compile Report to generate compliance records.</p>
        </div>
      )}

    </div>
  );
};
