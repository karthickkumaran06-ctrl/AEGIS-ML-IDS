import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Incident } from '../types';
import { 
  Flame, 
  Plus, 
  Clock, 
  Send, 
  Activity, 
  ShieldCheck, 
  FileCheck, 
  X, 
  RefreshCw,
  Sliders
} from 'lucide-react';

export const IncidentsView: React.FC = () => {
  const { token, refreshStats, addNotification } = useSecurity();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncId, setSelectedIncId] = useState<string | null>(null);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSev, setNewSev] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');

  const [logMsg, setLogMsg] = useState('');
  const [resolutionStr, setResolutionStr] = useState('');
  
  const [loading, setLoading] = useState(false);

  const fetchIncidents = async () => {
    try {
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/incidents', { headers });
      const data = await res.json();
      if (data.success) {
        setIncidents(data.data);
        if (data.data.length > 0 && !selectedIncId) {
          setSelectedIncId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [token]);

  const selectedIncident = incidents.find(inc => inc.id === selectedIncId);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          severity: newSev,
          affectedAssets: ['10.0.1.15'],
          sourceIps: ['198.51.100.22'],
          relatedAlertIds: []
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`INCIDENT ACTION: Successfully created incident ticket ${data.data.id}`);
        fetchIncidents();
        setSelectedIncId(data.data.id);
        setShowCreateForm(false);
        setNewTitle('');
        setNewDesc('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimelineLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logMsg.trim() || !selectedIncId) return;

    try {
      const res = await fetch(`/api/incidents/${selectedIncId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timelineMessage: logMsg
        })
      });

      const data = await res.json();
      if (data.success) {
        setLogMsg('');
        fetchIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (status: Incident['status']) => {
    if (!selectedIncId) return;

    try {
      const res = await fetch(`/api/incidents/${selectedIncId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          timelineMessage: `Incident transitioned to state "${status}".`
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`INCIDENT TRANSITION: Ticket state resolved to "${status}".`);
        fetchIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionStr.trim() || !selectedIncId) return;

    try {
      const res = await fetch(`/api/incidents/${selectedIncId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'Resolved',
          resolution: resolutionStr,
          timelineMessage: `Incident Case Closed. Mitigation resolution: "${resolutionStr}"`
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`INCIDENT CASE CLOSED: Escalated threat mitigated successfully.`);
        setResolutionStr('');
        fetchIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      
      {/* Left List Pane */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 flex flex-col justify-between h-[550px]">
        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900 shrink-0">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-red-500 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Active Incident Case File</h3>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              title="Spawn Manual Incident Ticket"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-1 scrollbar-thin">
            {incidents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-20">No active network incidents logged.</p>
            ) : (
              incidents.map(inc => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncId(inc.id)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                    selectedIncId === inc.id
                      ? 'bg-blue-600/10 border-blue-500/20 text-slate-200'
                      : 'bg-slate-900/40 border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-semibold font-mono text-slate-500">{inc.id}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                      inc.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      inc.severity === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      'bg-slate-850 text-slate-400 border-slate-800'
                    }`}>
                      {inc.severity}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1.5 truncate">{inc.title}</h4>
                  <div className="flex justify-between items-center mt-3 text-[10px] text-slate-500">
                    <span>Status: <strong className={inc.status === 'Open' ? 'text-red-400' : 'text-slate-400'}>{inc.status}</strong></span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(inc.createdDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button 
          onClick={fetchIncidents}
          className="w-full mt-4 py-2 border border-slate-900 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw size={12} />
          <span>Sync Case Files</span>
        </button>
      </div>

      {/* Right Detail Pane */}
      <div className="lg:col-span-2 bg-slate-950 border border-slate-900 rounded-xl p-5 h-[550px] flex flex-col justify-between relative overflow-hidden">
        {selectedIncident ? (
          <div className="h-full flex flex-col justify-between overflow-hidden">
            
            {/* Header metadata */}
            <div className="border-b border-slate-900 pb-3 shrink-0 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono text-slate-500">CASE FILE #{selectedIncident.id}</span>
                <h3 className="text-sm font-bold text-slate-100 mt-1">{selectedIncident.title}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{selectedIncident.description}</p>
              </div>
              <div className="text-right">
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                  selectedIncident.status === 'Open' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  selectedIncident.status === 'Investigating' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  selectedIncident.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  {selectedIncident.status.toUpperCase()}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-2">Owner: {selectedIncident.assignedTo}</span>
              </div>
            </div>

            {/* Middle body split (Timeline & Updates logs) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 my-4 overflow-hidden">
              
              {/* Chronological Timeline */}
              <div className="flex flex-col overflow-hidden">
                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Diagnostic Chronological Logs</h4>
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 py-1 scrollbar-thin">
                  {selectedIncident.timeline.map((log, idx) => (
                    <div key={idx} className="relative pl-4 border-l border-slate-900 text-[11px] text-slate-400">
                      <div className="absolute -left-1.5 top-1 w-2.5 h-2.5 rounded-full bg-slate-900 border border-blue-500"></div>
                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span>By: {log.author.split(' ')[0]}</span>
                      </div>
                      <p className="text-slate-300 mt-0.5 font-medium leading-relaxed">{log.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Forensic updates inputs */}
              <div className="space-y-4 flex flex-col justify-between">
                
                {/* State transitioning */}
                <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Case Mitigation Status</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Investigating', 'Contained', 'Closed'].map(st => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(st as Incident['status'])}
                        className={`py-1 rounded text-[10px] font-semibold border cursor-pointer transition-all ${
                          selectedIncident.status === st
                            ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                            : 'bg-slate-950 border-slate-900 hover:border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Log timeline update message */}
                <form onSubmit={handleAddTimelineLog} className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Record Forensic Journal</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Input mitigation action log..."
                      value={logMsg}
                      onChange={(e) => setLogMsg(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-2 pl-3 pr-10 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-2 p-1 bg-blue-600 hover:bg-blue-500 rounded text-white cursor-pointer"
                    >
                      <Send size={11} />
                    </button>
                  </div>
                </form>

                {/* Case Resolution form */}
                {selectedIncident.status !== 'Resolved' && (
                  <form onSubmit={handleResolveIncident} className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Close Case File (mitigate)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Resolution summary statement..."
                        value={resolutionStr}
                        onChange={(e) => setResolutionStr(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-1.5 px-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-semibold text-xs transition-colors cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      >
                        Mitigate
                      </button>
                    </div>
                  </form>
                )}

                {selectedIncident.status === 'Resolved' && selectedIncident.resolution && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">Mitigation Resolution Statement</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1 leading-relaxed">{selectedIncident.resolution}</p>
                  </div>
                )}

              </div>

            </div>

          </div>
        ) : (
          <div className="text-center py-40 text-slate-500 text-xs">No selected incident logged. Select or spawn a case files ticket.</div>
        )}

        {/* Floating Spawn Form Modal */}
        {showCreateForm && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm p-6 flex flex-col justify-center items-center z-10">
            <div className="w-full max-w-md bg-slate-900 border border-slate-900 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <span className="font-bold text-xs text-slate-100 uppercase tracking-wider">Spawn New Incident Case</span>
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateIncident} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Incident Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Critical SYN Flood attack targetting WAN Core"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-2 px-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Forensics Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter analytical descriptions, forensic request logs..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-2 px-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-none"
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Severity Matrix</label>
                  <select
                    value={newSev}
                    onChange={(e) => setNewSev(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-2 px-3 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="Critical">Critical Severity</option>
                    <option value="High">High Severity</option>
                    <option value="Medium">Medium Severity</option>
                    <option value="Low">Low Severity</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-colors cursor-pointer"
                >
                  {loading ? 'Logging Ticket...' : 'File Ticket'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
