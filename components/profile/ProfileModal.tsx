'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SushiLogo } from '@/components/branding/SushiLogo';
import { RestaurantSettings } from '@/types/pos';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  X,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Download,
  Settings,
  LogOut,
  Info,
  Sparkles,
  QrCode,
  FileText,
} from 'lucide-react';

interface ProfileModalProps {
  settings: RestaurantSettings;
  isOpen: boolean;
  onClose: () => void;
  onOpenDownloadApk?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  settings,
  isOpen,
  onClose,
  onOpenDownloadApk,
}) => {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  if (!isOpen) return null;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const executeLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem('sushi_hotel_auth_token');
    onClose();
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Info size={18} />
            </span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Hotel Profile & About Us
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-300">
          {/* Top Brand Banner */}
          <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-900 border border-slate-800 shadow-inner">
            <SushiLogo size={56} showSubtitle={false} />
            <h1 className="text-xl font-black text-white mt-2 tracking-wider uppercase">
              {settings.restaurant_name}
            </h1>
            <p className="text-xs font-semibold text-amber-400 tracking-wide mt-0.5 uppercase">
              {settings.tagline || 'PADALUR • OOTTATHUR ROAD'}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Active Terminal: Counter 1
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Staff ID #SH-01
              </span>
            </div>
          </div>

          {/* About Us Section */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              About Sushi Hotel
            </h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Located conveniently on <strong>Padalur – Oottathur Road</strong>, Sushi Hotel is dedicated to offering authentic quality, taste, and lightning-fast service. Renowned for our special seeraga samba <strong>Chicken & Mutton Dum Biryani</strong>, hot flaky <strong>Malabar and Bun Parottas</strong>, authentic <strong>Chettinad curries</strong>, traditional <strong>South Indian meals</strong>, snacks, and refreshing juices.
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Our smart digital billing system guarantees precision accounting, zero-latency touchscreen ordering, instant 80mm/58mm thermal receipt printing, and seamless offline data synchronization.
            </p>
          </div>

          {/* Contact Details */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-white">Contact & Location</h3>

            <div className="space-y-2.5 text-[11px]">
              <div className="flex items-start gap-2.5 text-slate-300">
                <MapPin size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Hotel Address:</strong>
                  <span>{settings.address}</span>
                </div>
              </div>

              {settings.phone && (
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Phone size={16} className="text-amber-400 shrink-0" />
                  <div>
                    <strong className="text-white mr-1.5">Phone:</strong>
                    <span>{settings.phone}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-slate-300">
                <Clock size={16} className="text-amber-400 shrink-0" />
                <div>
                  <strong className="text-white mr-1.5">Operating Hours:</strong>
                  <span>6:00 AM – 11:30 PM (Open All 7 Days)</span>
                </div>
              </div>

              {settings.gstin && (
                <div className="flex items-center gap-2.5 text-slate-300">
                  <FileText size={16} className="text-amber-400 shrink-0" />
                  <div>
                    <strong className="text-white mr-1.5">GSTIN:</strong>
                    <span className="font-mono">{settings.gstin}</span>
                  </div>
                </div>
              )}

              {settings.upi_id && (
                <div className="flex items-center gap-2.5 text-slate-300">
                  <QrCode size={16} className="text-amber-400 shrink-0" />
                  <div>
                    <strong className="text-white mr-1.5">UPI ID:</strong>
                    <span className="font-mono text-amber-400">{settings.upi_id}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {onOpenDownloadApk && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDownloadApk();
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <Download size={15} />
                Download Android APK
              </button>
            )}

            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all active:scale-95"
            >
              <Settings size={15} />
              POS Settings
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div>
            <div className="font-semibold text-slate-300">Sushi Hotel Smart POS v1.2.0</div>
            <div className="text-[10px] text-slate-500">© 2026 Sushi Hotel. All rights reserved.</div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold border border-rose-800/80 transition-all active:scale-95"
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </div>

      {/* Logout In-Screen Confirmation Modal */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Log Out from Session?"
        message="Are you sure you want to log out of your current Sushi Hotel POS session?"
        confirmText="Log Out"
        type="danger"
        onConfirm={executeLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};
