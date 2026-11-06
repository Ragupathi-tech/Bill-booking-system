'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              type === 'error'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {type === 'error' ? (
              <AlertCircle size={20} />
            ) : type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <Info size={20} />
            )}
          </div>

          <div className="flex-1 pr-6">
            <h3 className="text-sm font-bold text-white tracking-tight">
              {title || (type === 'error' ? 'Notice' : 'Information')}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
