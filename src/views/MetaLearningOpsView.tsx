import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { ModelVersion } from '../types';
import { 
  Cpu, 
  Settings2, 
  TrendingUp, 
  History, 
  RotateCcw, 
  CheckCircle,
  HelpCircle,
  Zap,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const MetaLearningOpsView: React.FC = () => {
  const { token, refreshStats, addNotification } = useSecurity();
  const [modelData, setModelData] = useState<any>(null);
  
  // Custom adaptation settings
  const [targetThreat, setTargetThreat] = useState('Zero-Day Alpha');
  const [supportShots, setSupportShots] = useState(5);
  const [learningRate, setLearningRate] = useState(0.001);
  const [steps, setSteps] = useState(100);

  const [adapting, setAdapting] = useState(false);
  const [trainingLogs, setTrainingLogs] = useState<{ step: number; loss: number; accuracy: number; gradientShift: number }[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const fetchModelData = async () => {
    try {
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/models', { headers });
      const data = await res.json();
      if (data.success) {
        setModelData(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchModelData();
  }, [token]);

  const handleStartAdaptation = async () => {
    setAdapting(true);
    setTrainingLogs([]);
    setCurrentStep(0);
    addNotification(`ML ENGINE ACTION: Initiated ${supportShots}-shot model adaptation for [${targetThreat}].`);

    // Simulate training ticks inside client
    let tickStep = 0;
    const interval = setInterval(() => {
      tickStep += 10;
      setCurrentStep(tickStep);
      
      const ratio = tickStep / steps;
      const stepLoss = Math.max(0.06, 1.42 - ratio * 1.35 + (Math.random() * 0.04));
      const stepAcc = Math.min(99.6, 64.2 + ratio * 35.1 + (Math.random() * 1.2));
      const stepGrad = Math.max(0.0001, 0.45 * Math.exp(-ratio * 4) + (Math.random() * 0.01));

      setTrainingLogs(prev => [...prev, {
        step: tickStep,
        loss: parseFloat(stepLoss.toFixed(4)),
        accuracy: parseFloat(stepAcc.toFixed(2)),
        gradientShift: parseFloat(stepGrad.toFixed(5))
      }]);

      if (tickStep >= steps) {
        clearInterval(interval);
        completeAdaptationOnServer();
      }
    }, 250);
  };

  const completeAdaptationOnServer = async () => {
    try {
      const res = await fetch('/api/models/adapt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          threatClass: targetThreat,
          supportShots,
          lr: learningRate,
          adaptationSteps: steps
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`ML ENGINE SUCCESS: Model fully adapted and rolled out to version: [${data.data.modelCreated.version}].`);
        fetchModelData();
        refreshStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdapting(false);
    }
  };

  const handleRollback = async (version: string) => {
    try {
      const res = await fetch('/api/models/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ version })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`ML ROLLOOUT ROLLBACK: Dispatched model state back to version ${version}`);
        fetchModelData();
        refreshStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Safe fallback properties
  const activeModel = modelData?.activeModel || { version: 'v1.0.0 (Base)', accuracy: 94.2, precision: 93.8, recall: 94.1, f1: 93.9, adaptations: ['SQL Injection Base', 'SYN Flood Base', 'Port Scan Base'] };
  const modelVersions = modelData?.versions || [activeModel];

  // Draw 2D Prototype Cluster constellation map
  const renderPrototypeConstellation = () => {
    const isAdaptedAlpha = activeModel.adaptations.includes('Zero-Day Alpha Adapted') || activeModel.adaptations.some((a: string) => a.includes('Zero-Day Alpha'));
    const isAdaptedBeta = activeModel.adaptations.includes('Zero-Day Beta Adapted') || activeModel.adaptations.some((a: string) => a.includes('Zero-Day Beta'));

    return (
      <svg className="w-full h-full text-slate-500 overflow-visible" viewBox="0 0 300 220">
        {/* Background grid lines */}
        <circle cx="150" cy="110" r="90" stroke="#1e293b" fill="none" strokeDasharray="3 3" />
        <circle cx="150" cy="110" r="50" stroke="#1e293b" fill="none" strokeDasharray="2 2" />
        <line x1="150" y1="20" x2="150" y2="200" stroke="#1e293b" strokeDasharray="4 4" />
        <line x1="50" y1="110" x2="250" y2="110" stroke="#1e293b" strokeDasharray="4 4" />

        {/* Prototype Centers - Benign Cluster (Green) */}
        <circle cx="90" cy="70" r="6" className="fill-emerald-500" />
        <circle cx="90" cy="70" r="16" className="fill-emerald-500/10 stroke-emerald-500/20 stroke-1" />
        <text x="90" y="50" textAnchor="middle" fill="#10b981" className="text-[7px] font-mono font-bold">Benign</text>

        {/* SQL Injection Cluster (Blue) */}
        <circle cx="210" cy="70" r="6" className="fill-blue-500" />
        <circle cx="210" cy="70" r="18" className="fill-blue-500/10 stroke-blue-500/20 stroke-1" />
        <text x="210" y="50" textAnchor="middle" fill="#3b82f6" className="text-[7px] font-mono font-bold">SQL Injection</text>

        {/* SYN Flood Cluster (Orange) */}
        <circle cx="90" cy="160" r="6" className="fill-orange-500" />
        <circle cx="90" cy="160" r="18" className="fill-orange-500/10 stroke-orange-500/20 stroke-1" />
        <text x="90" y="185" textAnchor="middle" fill="#f97316" className="text-[7px] font-mono font-bold">SYN Flood</text>

        {/* Zero-Day Alpha Cluster (RCE) - Glowing/Grown indicator */}
        <circle cx="210" cy="150" r="6" className={isAdaptedAlpha ? 'fill-cyan-400' : 'fill-slate-500'} />
        <circle cx="210" cy="150" r="18" className={`stroke-1 ${isAdaptedAlpha ? 'fill-cyan-500/10 stroke-cyan-500/30' : 'fill-slate-900/40 stroke-slate-800'}`} />
        <text x="210" y="178" textAnchor="middle" fill={isAdaptedAlpha ? '#22d3ee' : '#64748b'} className="text-[7px] font-mono font-bold">
          {isAdaptedAlpha ? 'Zero-Day Alpha (Adapted)' : 'Zero-Day Alpha (Unadapted)'}
        </text>
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      
      {/* Left Pane: Current Model Architecture Stats & Version Rolling rollback */}
      <div className="space-y-6">
        
        {/* Model Metrics */}
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Active Model Metrics</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
              <span className="text-[8px] text-slate-500 block font-semibold uppercase leading-none">ACCURACY</span>
              <span className="text-base font-bold font-mono tracking-tight text-slate-100 mt-1 block">{activeModel.accuracy}%</span>
            </div>
            <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
              <span className="text-[8px] text-slate-500 block font-semibold uppercase leading-none">F1 SCORE</span>
              <span className="text-base font-bold font-mono tracking-tight text-slate-100 mt-1 block">{activeModel.f1}%</span>
            </div>
            <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
              <span className="text-[8px] text-slate-500 block font-semibold uppercase leading-none">PRECISION</span>
              <span className="text-xs font-bold font-mono text-slate-300 mt-1 block">{activeModel.precision}%</span>
            </div>
            <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
              <span className="text-[8px] text-slate-500 block font-semibold uppercase leading-none">RECALL</span>
              <span className="text-xs font-bold font-mono text-slate-300 mt-1 block">{activeModel.recall}%</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/40 border border-slate-900 rounded-lg space-y-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Adapted Attack Classes</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeModel.adaptations.map((ad: string, idx: number) => (
                <span 
                  key={idx}
                  className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950/20 text-blue-400 border border-blue-500/10"
                >
                  {ad}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Rollback versions history */}
        <div className="bg-slate-950 border border-slate-900 p-5 rounded-xl space-y-4 h-64 flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Models Rollout Registry</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-1 scrollbar-thin">
            {modelVersions.map((m: any, idx: number) => (
              <div 
                key={idx}
                className={`p-2.5 rounded-lg border flex justify-between items-center ${
                  m.status === 'Active' 
                    ? 'bg-blue-600/10 border-blue-500/20 text-slate-200' 
                    : 'bg-slate-900/20 border-slate-900 text-slate-400'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-slate-200">{m.version}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{m.date} · Acc: {m.accuracy}%</p>
                </div>
                {m.status === 'Active' ? (
                  <span className="text-[9px] font-mono font-semibold tracking-wider text-emerald-400">ACTIVE</span>
                ) : (
                  <button
                    onClick={() => handleRollback(m.version)}
                    className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[9px] font-bold text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    Deploy
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Middle/Right Pane: Few-Shot Adaptation workflow panel */}
      <div className="lg:col-span-2 bg-slate-950 border border-slate-900 p-5 rounded-xl flex flex-col justify-between h-[510px]">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
          
          {/* Adaptation controls */}
          <div className="space-y-4 flex flex-col justify-between pb-2">
            <div>
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Configure Support Shots</h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Adjust few-shot training parameters to adapt prototypes space targetting zero-day vector clusters.</p>
            </div>

            <div className="space-y-4">
              {/* Select target */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">TARGET ZERO-DAY CLASS</label>
                <select
                  value={targetThreat}
                  onChange={(e) => setTargetThreat(e.target.value)}
                  disabled={adapting}
                  className="w-full bg-slate-900 border border-slate-900 text-xs text-slate-300 rounded-lg py-2 px-3 focus:outline-none"
                >
                  <option value="Zero-Day Alpha">Zero-Day Alpha (In-Memory RCE)</option>
                  <option value="Zero-Day Beta">Zero-Day Beta (DNS Tunnel Exfil)</option>
                </select>
              </div>

              {/* Slider support shots */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                  <span>SUPPORT SAMPLES (SHOTS)</span>
                  <span className="text-blue-400">{supportShots}-shot</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="15"
                  step="1"
                  value={supportShots}
                  onChange={(e) => setSupportShots(parseInt(e.target.value))}
                  disabled={adapting}
                  className="w-full accent-blue-500 h-1 bg-slate-900 rounded"
                />
              </div>

              {/* Slider LR */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                  <span>INNER LEARNING RATE (LR)</span>
                  <span className="text-cyan-400">{learningRate}</span>
                </div>
                <input
                  type="range"
                  min="0.0005"
                  max="0.01"
                  step="0.0005"
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  disabled={adapting}
                  className="w-full accent-cyan-500 h-1 bg-slate-900 rounded"
                />
              </div>
            </div>

            {/* Run adaptation trigger */}
            <button
              onClick={handleStartAdaptation}
              disabled={adapting}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-900 text-white disabled:text-slate-500 font-semibold text-xs rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              {adapting ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
              <span>{adapting ? 'Optimizing Prototypes...' : `Start Few-Shot Adaptation`}</span>
            </button>
          </div>

          {/* SVG embedding prototype space */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Prototype Cluster Projections</h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">2D embedding projection of feature vector clustering center nodes.</p>
            </div>

            <div className="flex-1 flex items-center justify-center bg-slate-950/40 border border-slate-900/60 rounded-xl my-4">
              {renderPrototypeConstellation()}
            </div>
          </div>

        </div>

        {/* Live Training logs ticker if training */}
        {adapting && (
          <div className="mt-4 p-3 bg-slate-950 border border-slate-900/80 rounded-lg flex items-center justify-between text-xs select-none shrink-0 font-mono">
            <div className="flex items-center gap-2">
              <Sparkles className="text-cyan-400 animate-pulse" size={14} />
              <span className="text-slate-300 font-bold">Optimization step: {currentStep}/{steps}</span>
            </div>
            {trainingLogs.length > 0 && (
              <div className="space-x-4 text-slate-500 text-[10px]">
                <span>Loss: <strong className="text-red-400">{trainingLogs[trainingLogs.length - 1].loss}</strong></span>
                <span>Accuracy: <strong className="text-emerald-400">{trainingLogs[trainingLogs.length - 1].accuracy}%</strong></span>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
