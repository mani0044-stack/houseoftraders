import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, User, Eye, EyeOff, ShieldCheck, ArrowRight, RefreshCw, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { useAuthStore } from '../store/useAuthStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isLoading, error, clearError } = useAuthStore();

  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    let success = false;
    if (isRegisterMode) {
      success = await register(email, password, name);
    } else {
      success = await login(email, password);
    }

    if (success) {
      navigate(from, { replace: true });
    }
  };

  const handleFillDefaultAdmin = () => {
    setEmail('admin@houseoftraders.io');
    setPassword('admin123');
    setIsRegisterMode(false);
    clearError();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden z-10 animate-fadeIn">
        {/* Header Banner */}
        <div className="bg-[#0F3D33] p-8 text-center border-b border-[#1C5245] relative">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 border border-white/20 shadow-inner mb-3">
            <img src={logoImg} alt="House of Traders" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">House of Traders</h1>
          <p className="text-xs text-[#B7D0C7] font-medium mt-1">
            Algorithmic Options & SmartAPI Multi-Account Terminal
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Database-Authenticated Trading Access</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-7 space-y-5">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                clearError();
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegisterMode
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                clearError();
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                isRegisterMode
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-xs uppercase text-slate-500 font-bold mb-1.5 tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Trader Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1.5 tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@houseoftraders.io"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1.5 tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegisterMode ? 'Minimum 6 characters' : 'Enter password'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#0F3D33] hover:bg-[#165648] text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials in Database...</span>
                </>
              ) : (
                <>
                  <span>{isRegisterMode ? 'Create Account & Access Terminal' : 'Sign In to Terminal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Default Credentials Helper for Admins */}
          {!isRegisterMode && (
            <div className="pt-2 border-t border-slate-100">
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-emerald-950">First-Time Setup Default Account:</p>
                  <p className="text-[11px] text-emerald-800 font-mono mt-0.5">
                    admin@houseoftraders.io / admin123
                  </p>
                  <button
                    type="button"
                    onClick={handleFillDefaultAdmin}
                    className="mt-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" /> Auto-fill Default Admin
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="text-center pt-2">
            <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Passwords salted & hashed with PBKDF2-SHA256 in Neon PostgreSQL</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

