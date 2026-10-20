import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';
import { Shield, Eye, EyeOff, Lock, Mail, ServerCrash, Key, Skull } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useSecurity();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError('Please provide username and security key credentials.');
      setLoading(false);
      return;
    }

    const success = await login(email, password);
    if (!success) {
      setError('Access Denied. Invalid analyst credentials or signature hashes.');
    }
    setLoading(false);
  };

  const fillCredentials = (role: 'admin' | 'analyst') => {
    if (role === 'admin') {
      setEmail('admin@aegis.io');
      setPassword('Admin123!');
    } else {
      setEmail('analyst@aegis.io');
      setPassword('Analyst123!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Decorative background grid and ambient shadows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]"></div>

      {/* Login Box */}
      <div className="relative w-full max-w-md bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Branding lockup */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">AEGIS SECURITY PORTAL</h1>
            <p className="text-xs text-slate-500">Adaptive Meta-Learning IDS Control Console</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2.5 text-xs text-red-400 font-medium">
            <ServerCrash size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">ANALYST IDENTIFICATION (EMAIL)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500" />
              <input
                type="email"
                placeholder="analyst@aegis.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/60 hover:bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">SECURITY ACCESS PASSCODE</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/60 hover:bg-slate-950 border border-slate-900 focus:border-blue-500/50 rounded-lg py-2.5 pl-10 pr-10 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Remember me bar */}
          <div className="flex justify-between items-center text-[11px] text-slate-500 select-none">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded bg-slate-950 border-slate-900 text-blue-600 focus:ring-0 cursor-pointer" />
              <span>Remember signature</span>
            </label>
            <span className="hover:underline cursor-pointer">Forgot secure hashes?</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-[0_0_15px_rgba(37,99,235,0.2)] cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Validating Signatures...' : 'Initialize Secure Connection'}
          </button>
        </form>

        {/* Quick Demo Access selectors */}
        <div className="pt-4 border-t border-slate-900/60 space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            <Key size={12} />
            <span>Interactive Demo Credentials</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fillCredentials('admin')}
              className="py-2 px-3 border border-slate-900 hover:border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 rounded-lg text-left text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            >
              <p className="text-[10px] font-bold">Admin Console</p>
              <p className="text-[8px] text-slate-500 mt-0.5">Full administrative privilege</p>
            </button>
            <button
              onClick={() => fillCredentials('analyst')}
              className="py-2 px-3 border border-slate-900 hover:border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 rounded-lg text-left text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            >
              <p className="text-[10px] font-bold">SOC Analyst</p>
              <p className="text-[8px] text-slate-500 mt-0.5">Incident Forensics & ML Ops</p>
            </button>
          </div>
        </div>

        {/* Dedicated Switch to Red Team Login */}
        <div className="pt-2 border-t border-slate-900/60 text-center">
          <Link
            to="/redteam/login"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-xs text-red-400 hover:text-red-300 font-mono transition-colors"
          >
            <Skull size={13} className="text-red-400" />
            <span>Switch to Red Team (Hacker Portal) →</span>
          </Link>
        </div>

      </div>
    </div>
  );
};
