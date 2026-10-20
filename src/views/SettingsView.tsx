import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { SystemSettings } from '../types';
import { Settings, Save, Sliders, BellRing, RefreshCw } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { token, refreshStats, addNotification } = useSecurity();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [appName, setAppName] = useState('');
  const [confThresh, setConfThresh] = useState(75);
  const [retention, setRetention] = useState(500);
  const [autoBlock, setAutoBlock] = useState(true);
  
  const [lr, setLr] = useState(0.001);
  const [shots, setShots] = useState(5);
  const [steps, setSteps] = useState(100);

  const fetchSettings = async () => {
    try {
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/system/settings', { headers });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setAppName(data.data.appName);
        setConfThresh(data.data.confidenceThreshold);
        setRetention(data.data.retention);
        setAutoBlock(data.data.autoBlocking);
        setLr(data.data.learningRate);
        setShots(data.data.supportShots);
        setSteps(data.data.adaptationSteps);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appName,
          confidenceThreshold: confThresh,
          retention,
          autoBlocking: autoBlock,
          learningRate: lr,
          supportShots: shots,
          adaptationSteps: steps
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification('SETTINGS UPDATE: App settings saved and applied to active firewall modules.');
        fetchSettings();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500 text-xs animate-pulse">Loading system settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto select-none">
      <form onSubmit={handleSaveSettings} className="space-y-6 text-left">
        
        {/* Card 1: General Core configs */}
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
            <Settings className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">General Configurations</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Application Brand Title</label>
              <input
                type="text"
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-900 text-xs text-slate-200 rounded-lg py-2 px-3 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                  <span>Meta-Engine Conf threshold</span>
                  <span className="text-cyan-400">{confThresh}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={confThresh}
                  onChange={(e) => setConfThresh(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-slate-900 rounded"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                  <span>Frames buffer Retention limit</span>
                  <span className="text-blue-400">{retention} pkts</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={retention}
                  onChange={(e) => setRetention(parseInt(e.target.value))}
                  className="w-full accent-blue-500 h-1 bg-slate-900 rounded"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/30 border border-slate-900 rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 block">Active Firewall IPS Blocking</span>
                <span className="text-[10px] text-slate-500 leading-none">Drop packets exfiltrations and injects instantly.</span>
              </div>
              <input
                type="checkbox"
                checked={autoBlock}
                onChange={(e) => setAutoBlock(e.target.checked)}
                className="rounded bg-slate-950 border-slate-900 text-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Neural Net parameters MLOps defaults */}
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Default Model Parameters</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Meta loop LR</label>
              <input
                type="number"
                step="0.0005"
                value={lr}
                onChange={(e) => setLr(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-900 text-xs text-slate-200 rounded-lg py-2 px-3 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Support shots</label>
              <input
                type="number"
                value={shots}
                onChange={(e) => setShots(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-900 text-xs text-slate-200 rounded-lg py-2 px-3 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Inner Steps</label>
              <input
                type="number"
                value={steps}
                onChange={(e) => setSteps(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-900 text-xs text-slate-200 rounded-lg py-2 px-3 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)] shrink-0"
        >
          {saving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
          <span>{saving ? 'Applying Configurations...' : 'Save Settings'}</span>
        </button>

      </form>
    </div>
  );
};
