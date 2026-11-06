'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SushiLogo } from '@/components/branding/SushiLogo';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('admin@sushihotel.com');
  const [password, setPassword] = useState('sushihotel2026');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    setTimeout(() => {
      if (isSetupMode) {
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters long.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match.');
          setIsLoading(false);
          return;
        }

        // Save admin credentials
        localStorage.setItem(
          'sushi_hotel_admin_credentials',
          JSON.stringify({ email, password, createdAt: new Date().toISOString() })
        );
        localStorage.setItem('sushi_hotel_auth_token', 'active-pos-session');

        setSuccessMessage('Admin credentials set! Launching POS...');
        setTimeout(() => {
          router.push('/');
        }, 800);
        return;
      }

      // Normal Login Check
      const saved = localStorage.getItem('sushi_hotel_admin_credentials');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.email === email && parsed.password === password) {
            localStorage.setItem('sushi_hotel_auth_token', 'active-pos-session');
            router.push('/');
            return;
          }
        } catch (e) {
          // fallback to default
        }
      }

      // Standard default credentials
      if (
        (email === 'admin@sushihotel.com' || email === 'counter') &&
        (password === 'sushihotel2026' || password === '1234')
      ) {
        localStorage.setItem('sushi_hotel_auth_token', 'active-pos-session');
        router.push('/');
        return;
      }

      setErrorMessage('Invalid username or password. Please try again.');
      setIsLoading(false);
    }, 400);
  };

  const handleQuickFill = (u: string, p: string) => {
    setEmail(u);
    setPassword(p);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <SushiLogo size={60} showSubtitle={true} />
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">
              {isSetupMode ? 'Create Admin Account' : 'Counter Staff Login'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isSetupMode
                ? 'Initial setup wizard for Sushi Hotel billing system'
                : 'Sign in to access touchscreen billing & live sales'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsSetupMode(false);
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              !isSetupMode
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Staff Login
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSetupMode(true);
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              isSetupMode
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Admin Setup
          </button>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl text-xs text-rose-300 text-center font-medium">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 text-center font-medium">
            {successMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sushihotel.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isSetupMode && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : isSetupMode ? (
              <>
                <UserPlus size={18} />
                Save & Start POS
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Sign In to POS
              </>
            )}
          </button>
        </form>

        {/* Quick Fill Demo Helper for Counter Staff */}
        {!isSetupMode && (
          <div className="pt-2 border-t border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
              Quick Fill Demo Credentials
            </span>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@sushihotel.com', 'sushihotel2026')}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-amber-400/90 hover:border-amber-500/40"
              >
                admin@sushihotel.com
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('counter', '1234')}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 hover:border-slate-700"
              >
                counter / 1234
              </button>
            </div>
          </div>
        )}

        {/* Bottom Footer */}
        <div className="text-center text-[10px] text-slate-500">
          SUSHI HOTEL POS • Padalur – Oottathur Road
        </div>
      </div>
    </div>
  );
}
