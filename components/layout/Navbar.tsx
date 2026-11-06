'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SushiLogo } from '@/components/branding/SushiLogo';
import { posStore, subscribeToStore } from '@/lib/db/posStore';
import { RestaurantSettings } from '@/types/pos';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { DownloadApkModal } from '@/components/apk/DownloadApkModal';
import {
  Receipt,
  LayoutDashboard,
  History,
  Utensils,
  BarChart3,
  Settings,
  LogOut,
  User,
  Download,
  Smartphone,
  Info,
  RefreshCw,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queueStatus, setQueueStatus] = useState({ pendingCount: 0, isSyncing: false });
  const [settings, setSettings] = useState<RestaurantSettings>(posStore.getSettings());

  // Modals state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateStore = () => {
      setQueueStatus(posStore.getQueueStatus());
      setSettings(posStore.getSettings());
    };
    updateStore();
    const unsub = subscribeToStore(updateStore);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  const navItems = [
    { href: '/', label: 'Billing POS', icon: Receipt },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/bills', label: 'History', icon: History },
    { href: '/products', label: 'Menu Items', icon: Utensils },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <header className="h-14 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        {/* Left: Brand Identity */}
        <Link href="/" className="flex items-center gap-2.5 group select-none">
          <SushiLogo size={32} showSubtitle={false} />
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-wider text-white uppercase group-hover:text-amber-400 transition-colors">
              SUSHI <span className="text-amber-400">HOTEL</span>
            </span>
            <span className="text-[9px] font-medium text-slate-400 tracking-wider">
              PADALUR
            </span>
          </div>
        </Link>

        {/* Center: Modern Segmented Pill Navigation */}
        <nav className="hidden lg:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-slate-950' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions, Download APK & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Subtle Online Dot */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium">
            {queueStatus.isSyncing ? (
              <>
                <RefreshCw size={11} className="text-blue-400 animate-spin" />
                <span className="text-blue-300">Syncing</span>
              </>
            ) : isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-slate-300">Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#f87171]" />
                <span className="text-rose-300">Offline</span>
                {queueStatus.pendingCount > 0 && (
                  <span className="bg-rose-500 text-white rounded-full px-1 text-[9px] font-bold">
                    {queueStatus.pendingCount}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Download APK Button */}
          <button
            type="button"
            onClick={() => setIsApkModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-500/50 shadow-md shadow-emerald-950/40 transition-all active:scale-95"
            title="Download Android APK for Mobile/Tablet"
          >
            <Smartphone size={14} />
            <span className="hidden md:inline">Download APK</span>
            <span className="md:hidden">APK</span>
          </button>

          {/* Interactive Hotel Profile Button */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 py-1 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-all active:scale-95 shadow-sm"
            title="View Hotel Profile, About Us & Contacts"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
              <User size={13} />
            </div>
            <span className="font-semibold hidden sm:inline">Profile</span>
          </button>
        </div>
      </header>

      {/* Hotel Profile Modal (Logo, About Us, Contact, Footer) */}
      <ProfileModal
        settings={settings}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenDownloadApk={() => setIsApkModalOpen(true)}
      />

      {/* Download APK Modal */}
      <DownloadApkModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </>
  );
};
