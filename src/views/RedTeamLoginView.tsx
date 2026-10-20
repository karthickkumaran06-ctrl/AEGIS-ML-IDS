import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Skull, KeyRound, Eye, EyeOff, ShieldCheck, Terminal, ArrowRight, Zap, ShieldAlert } from 'lucide-react';

export const RedTeamLoginView: React.FC = () => {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [authMode, setAuthMode] = useState<'token' | 'creds'>('token');
  const [password, setPassword] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      if (authMode === 'token') {
        if (accessCode.trim().toUpperCase() === 'REDTEAM2026') {
          const session = {
            operator: 'Operator-7 (Ghost)',
            role: 'Red Team Lead',
            token: 'rt_' + Date.now(),
            loggedAt: new Date().toISOString()
          };
          localStorage.setItem('redteam_session', JSON.stringify(session));
          navigate('/redteam');
          return;
        }
      } else {
        if (operatorId === 'operator@redteam.sh' && password === 'RedTeam123!') {
          const session = {
            operator: 'David Lightman (Red Persona)',
            role: 'Offensive Security Specialist',
            token: 'rt_' + Date.now(),
            loggedAt: new Date().toISOString()
          };
          localStorage.setItem('redteam_session', JSON.stringify(session));
          navigate('/redteam');
          return;
        }
      }

      setError('ACCESS REJECTED. Invalid cryptographic token or unauthorized signature.');
      setLoading(false);
    }, 400);
  };

  const fillQuick = (type: 'token' | 'creds') => {
    if (type === 'token') {
      setAuthMode('token');
      setAccessCode('REDTEAM2026');
    } else {
      setAuthMode('creds');
      setOperatorId('operator@redteam.sh');
      setPassword('RedTeam123!');
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-red-100 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-mono">
      {/* Background terminal grid with deep crimson glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f0808_1px,transparent_1px),linear-gradient(to_bottom,#1f0808_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-red-950/20 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Floating status badge */}
      <div className="relative mb-6 flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-500/20 text-[10px] text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
        <span>ISOLATED OFFENSIVE SECURITY GATEWAY</span>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md bg-black/60 backdrop-blur-xl border border-red-900/40 rounded-2xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.15)] space-y-6">

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-950 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)] border border-red-500/30">
            <Skull className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-red-400">AEGIS RED TEAM PORTAL</h1>
            <p className="text-[11px] text-slate-500 mt-1">Independent Penetration & Exploit Console</p>
          </div>
        </div>

        {/* Auth mode toggle */}
        <div className="flex bg-slate-950/80 p-1 rounded-lg border border-red-900/30 text-xs">
          <button
            type="button"
            onClick={() => { setAuthMode('token'); setError(null); }}
            className={`flex-1 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              authMode === 'token'
                ? 'bg-red-950/70 text-red-300 border border-red-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Access Token
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('creds'); setError(null); }}
            className={`flex-1 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              authMode === 'creds'
                ? 'bg-red-950/70 text-red-300 border border-red-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Operator Identity
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg flex items-center gap-2.5 text-xs text-red-400 font-medium">
            <ShieldAlert size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {authMode === 'token' ? (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                RED TEAM SECURITY CLEARANCE TOKEN
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-red-500/60" />
                <input
                  type={showCode ? 'text' : 'password'}
                  placeholder="Enter REDTEAM2026..."
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full bg-slate-950/80 border border-red-900/30 focus:border-red-500/60 rounded-lg py-2.5 pl-10 pr-10 text-xs text-red-200 placeholder-slate-700 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-3 top-3 text-slate-600 hover:text-slate-400 cursor-pointer"
                >
                  {showCode ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                  OPERATOR IDENTIFIER
                </label>
                <input
                  type="text"
                  placeholder="operator@redteam.sh"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-red-900/30 focus:border-red-500/60 rounded-lg py-2.5 px-3 text-xs text-red-200 placeholder-slate-700 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                  OPERATOR PASSCODE
                </label>
                <div className="relative">
                  <input
                    type={showCode ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/80 border border-red-900/30 focus:border-red-500/60 rounded-lg py-2.5 px-3 pr-10 text-xs text-red-200 placeholder-slate-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="absolute right-3 top-3 text-slate-600 hover:text-slate-400 cursor-pointer"
                  >
                    {showCode ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Zap size={14} />
            <span>{loading ? 'Authenticating Operator...' : 'INITIALIZE RED TEAM CONSOLE'}</span>
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="pt-4 border-t border-red-950/60 space-y-2.5">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Quick Red-Team Demo Access</p>
          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              onClick={() => fillQuick('token')}
              className="p-2 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-left text-xs cursor-pointer transition-colors"
            >
              <p className="text-[10px] font-bold text-red-300">Token Auth</p>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">REDTEAM2026</p>
            </button>
            <button
              onClick={() => fillQuick('creds')}
              className="p-2 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-left text-xs cursor-pointer transition-colors"
            >
              <p className="text-[10px] font-bold text-red-300">Operator Login</p>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">operator@redteam.sh</p>
            </button>
          </div>
        </div>

        {/* Link back to Blue Team */}
        <div className="pt-2 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
          >
            <span>Switch to AEGIS Blue Team (SOC Admin Portal)</span>
            <ArrowRight size={12} />
          </Link>
        </div>

      </div>
    </div>
  );
};
