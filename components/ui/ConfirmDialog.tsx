'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Trash2, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              type === 'danger'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : type === 'warning'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {type === 'danger' ? (
              <Trash2 size={20} />
            ) : type === 'warning' ? (
              <AlertTriangle size={20} />
            ) : (
              <Info size={20} />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
              {title}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {message}
            </p>
          </div>

          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 ${
              type === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
