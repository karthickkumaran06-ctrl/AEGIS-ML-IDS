import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { DetectionRule } from '../types';
import { 
  SearchCode, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Search,
  RefreshCw,
  X
} from 'lucide-react';

export const DetectionRulesView: React.FC = () => {
  const { token, refreshStats, addNotification } = useSecurity();
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [search, setSearch] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCate, setNewCate] = useState('Traffic Filter');
  const [newSev, setNewSev] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newProto, setNewProto] = useState<'TCP' | 'UDP' | 'ICMP' | 'ANY'>('TCP');
  const [newPattern, setNewPattern] = useState('');
  const [newAction, setNewAction] = useState<'Alert' | 'Block' | 'Log' | 'Monitor'>('Alert');

  // Rule Pattern Signature Tester variables
  const [testPattern, setTestPattern] = useState("UNION SELECT|INFORMATION_SCHEMA");
  const [testPayload, setTestPayload] = useState("POST /api/auth/login HTTP/1.1\\r\\n\\r\\nusername=admin&password=' UNION SELECT username, password FROM users --");
  const [testResult, setTestResult] = useState<{ tested: boolean; matched: boolean } | null>(null);
  
  const [loading, setLoading] = useState(false);

  const fetchRules = async () => {
    try {
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/rules', { headers });
      const data = await res.json();
      if (data.success) {
        setRules(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [token]);

  const handleToggleStatus = async (ruleId: string, currentStatus: DetectionRule['status']) => {
    const nextStatus = currentStatus === 'Active' ? 'Disabled' : 'Active';
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`RULES ENGINE: Snort-rule ${ruleId} is now ${nextStatus}.`);
        fetchRules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Confirm deletion of this Snort threat rule?')) return;
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`RULES ENGINE: Snort-rule ${ruleId} has been purged from index.`);
        fetchRules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPattern.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          category: newCate,
          severity: newSev,
          protocol: newProto,
          pattern: newPattern,
          action: newAction
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`RULES ENGINE: Successfully appended Snort-signature [${newName}].`);
        fetchRules();
        setShowCreateModal(false);
        // Reset states
        setNewName('');
        setNewDesc('');
        setNewPattern('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPattern.trim() || !testPayload.trim()) return;

    try {
      const res = await fetch('/api/rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern: testPattern,
          payload: testPayload
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          tested: true,
          matched: data.data.matched
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRules = rules.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.pattern.toLowerCase().includes(search.toLowerCase()) ||
    r.id.includes(search)
  );

  return (
    <div className="space-y-6 select-none">
      
      {/* Top action and filter bar */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl flex items-center justify-between">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search Snort rule ID, patterns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-900 focus:border-blue-500/50 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
          />
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-colors cursor-pointer"
        >
          <Plus size={14} />
          <span>Append Detection Rule</span>
        </button>
      </div>

      {/* Main split (Catalog & Sandboxed Tester) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rules Catalog table */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-900 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-900 bg-slate-950/40 shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Snort Signature Catalog</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 text-[10px] uppercase font-bold bg-slate-950/40">
                  <th className="py-3 pl-4">Rule Code</th>
                  <th className="py-3">Details / Pattern</th>
                  <th className="py-3">Severity</th>
                  <th className="py-3">Proto</th>
                  <th className="py-3">Matches</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 pr-4 text-right">Purge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 text-slate-300 text-xs">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">No Snort detection rules matches.</td>
                  </tr>
                ) : (
                  filteredRules.map(rule => (
                    <tr key={rule.id} className="hover:bg-slate-900/20 transition-all">
                      <td className="py-3.5 pl-4 font-mono text-[11px] font-semibold text-slate-400">{rule.id}</td>
                      <td className="py-3.5">
                        <p className="font-semibold text-slate-200">{rule.name}</p>
                        <code className="text-[10px] text-blue-400 block mt-1 font-mono">content: &quot;{rule.pattern}&quot;</code>
                      </td>
                      <td className="py-3.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                          rule.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          rule.severity === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {rule.severity}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-slate-400 font-bold">{rule.protocol}</td>
                      <td className="py-3.5 font-mono text-slate-400 font-semibold tabular-nums">{rule.matchedCount}</td>
                      <td className="py-3.5">
                        <button
                          onClick={() => handleToggleStatus(rule.id, rule.status)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                            rule.status === 'Active'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}
                        >
                          {rule.status}
                        </button>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sandboxed Signature Tester Console */}
        <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pattern Signature Sandbox Test</h3>
            <p className="text-[11px] text-slate-500 mt-1">Verify regular expressions signatures against synthetic payload buffers.</p>
          </div>

          <form onSubmit={handleTestRule} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Regex Search Pattern</label>
              <div className="relative">
                <SearchCode className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. SELECT|UNION"
                  value={testPattern}
                  onChange={(e) => setTestPattern(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-200 font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Target Diagnostic Payload</label>
              <textarea
                required
                rows={4}
                placeholder="Diagnostic bytes..."
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-2 px-3 text-xs text-slate-300 font-mono focus:outline-none resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Terminal size={14} />
              <span>Verify Signature Match</span>
            </button>
          </form>

          {/* Test results indicator */}
          {testResult && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              testResult.matched
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {testResult.matched ? (
                <>
                  <XCircle size={20} className="shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold">SIGNATURE PATTERN DETECTED</h4>
                    <p className="text-[10px] mt-0.5 opacity-80">This payload matched search pattern filter blocks perfectly.</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle size={20} className="shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold">SIGNATURE PASSED CLEANLY</h4>
                    <p className="text-[10px] mt-0.5 opacity-80">No pattern intersections caught. Payload passed through firewall.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Append Rule Modal Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="font-bold text-xs text-slate-100 uppercase tracking-wider">Append Snort signature Rule</span>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Rule Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Remote deserialization filter block"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Snort Signature regex pattern</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UNION SELECT|INFORMATION_SCHEMA"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-2 px-3 text-xs text-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Protocol</label>
                  <select
                    value={newProto}
                    onChange={(e) => setNewProto(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-300 rounded-lg py-2 px-3 focus:outline-none"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                    <option value="ANY">ANY</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Firewall Action</label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-300 rounded-lg py-2 px-3 focus:outline-none"
                  >
                    <option value="Alert">Alert (Warn)</option>
                    <option value="Block">Block (Drop)</option>
                    <option value="Log">Log (Quiet)</option>
                    <option value="Monitor">Monitor (Deep)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Severity Matrix</label>
                <select
                  value={newSev}
                  onChange={(e) => setNewSev(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-300 rounded-lg py-2 px-3 focus:outline-none"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Creating Snort Rule...' : 'Deploy Signature Rule'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
