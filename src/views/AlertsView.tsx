import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Alert, Packet } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Search, 
  FolderPlus, 
  UserCheck, 
  Trash2,
  ChevronDown, 
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Eye
} from 'lucide-react';

export const AlertsView: React.FC = () => {
  const { token, alerts, packets, refreshStats, setSelectedPacket, addNotification } = useSecurity();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Perform filtering over central alerts list
  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = a.sourceIp.includes(search) || a.destIp.includes(search) || a.attackType.toLowerCase().includes(search.toLowerCase()) || a.id.includes(search);
    const matchesSev = sevFilter === 'ALL' || a.severity === sevFilter;
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesSev && matchesStatus;
  });

  const handleUpdateStatus = async (alertId: string, nextStatus: Alert['status']) => {
    setActionLoading(alertId);
    try {
      const res = await fetch(`/api/alerts/${alertId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: nextStatus,
          notes: `Status updated to ${nextStatus} via Alerts Console.`,
          assignedTo: 'David Lightman (SOC Analyst)'
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`ALERTS ACTION: Alert ${alertId} updated to state "${nextStatus}"`);
        refreshStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalateToIncident = async (alert: Alert) => {
    setActionLoading(`escalate-${alert.id}`);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Escalated alert: [${alert.attackType}] from source IP ${alert.sourceIp}`,
          description: `Threat incident raised via alerts panel escalation of critical alert id:${alert.id}. Forensic deep scan requested on host VM.`,
          severity: alert.severity === 'Critical' ? 'Critical' : 'High',
          affectedAssets: [alert.destIp],
          sourceIps: [alert.sourceIp],
          relatedAlertIds: [alert.id]
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`INCIDENT ESCALATED: Raised ticket ${data.data.id} for forensics containment.`);
        // Mark alert as resolved/investigated
        await handleUpdateStatus(alert.id, 'Investigating');
        navigate('/incidents');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Search and Filters panel */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          
          {/* Search IP/Class */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search threat class, IPs, rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-900 focus:border-blue-500/50 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          {/* Severity filter */}
          <select
            value={sevFilter}
            onChange={(e) => setSevFilter(e.target.value)}
            className="bg-slate-900/40 border border-slate-900 text-xs text-slate-300 rounded-lg py-1.5 px-3 focus:outline-none focus:border-blue-500/50 cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900/40 border border-slate-900 text-xs text-slate-300 rounded-lg py-1.5 px-3 focus:outline-none focus:border-blue-500/50 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="New">New</option>
            <option value="Investigating">Investigating</option>
            <option value="Confirmed">Confirmed</option>
            <option value="False Positive">False Positive</option>
            <option value="Resolved">Resolved</option>
            <option value="Suppressed">Suppressed</option>
          </select>
        </div>

        <button 
          onClick={refreshStats}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RefreshCw size={13} />
          <span>Refresh stream</span>
        </button>
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 text-[10px] uppercase font-bold bg-slate-950/40 select-none">
                <th className="py-3.5 pl-4">Alert ID</th>
                <th className="py-3.5">Severity</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5">Attack Classification</th>
                <th className="py-3.5">Source Node IP</th>
                <th className="py-3.5">Detection Engine</th>
                <th className="py-3.5">Confidence</th>
                <th className="py-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 text-slate-300 text-xs">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">No alerts matching filtration arguments.</td>
                </tr>
              ) : (
                filteredAlerts.map(alert => {
                  const relatedPacket = packets.find(p => p.id === alert.packetId);
                  return (
                    <tr key={alert.id} className="hover:bg-slate-900/30 transition-all">
                      <td className="py-3.5 pl-4 font-mono text-[11px] font-semibold text-slate-400">{alert.id}</td>
                      <td className="py-3.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          alert.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          alert.severity === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          alert.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-3.5 font-semibold">
                        <span className={`text-[10px] ${
                          alert.status === 'New' ? 'text-red-400' :
                          alert.status === 'Investigating' ? 'text-blue-400 animate-pulse' :
                          alert.status === 'Resolved' ? 'text-emerald-400' :
                          'text-slate-500'
                        }`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="py-3.5 font-semibold text-slate-200">{alert.attackType}</td>
                      <td className="py-3.5 font-mono">{alert.sourceIp}</td>
                      <td className="py-3.5 text-slate-400">{alert.engine}</td>
                      <td className="py-3.5 font-mono font-semibold text-cyan-400">{alert.confidence}%</td>
                      <td className="py-3.5 pr-4 text-right flex items-center justify-end gap-2.5">
                        
                        {/* Status controllers */}
                        {alert.status === 'New' && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, 'Investigating')}
                            disabled={actionLoading === alert.id}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer transition-all"
                          >
                            Acknowledge
                          </button>
                        )}

                        {alert.status === 'Investigating' && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, 'Resolved')}
                            disabled={actionLoading === alert.id}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer transition-all"
                          >
                            Resolve
                          </button>
                        )}

                        {/* Escalate incident */}
                        {alert.status !== 'Resolved' && (
                          <button
                            onClick={() => handleEscalateToIncident(alert)}
                            disabled={actionLoading === `escalate-${alert.id}`}
                            className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-orange-400 cursor-pointer transition-colors"
                            title="Escalate Alert to Incident Ticket"
                          >
                            <FolderPlus size={14} />
                          </button>
                        )}

                        {/* View related packet */}
                        {relatedPacket && (
                          <button
                            onClick={() => setSelectedPacket(relatedPacket)}
                            className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-blue-400 cursor-pointer transition-colors"
                            title="Inspect Packet Details"
                          >
                            <Eye size={14} />
                          </button>
                        )}

                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
