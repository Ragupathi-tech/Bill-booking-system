'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string; // Optional tooltip or accessibility label
  fallbackUrl?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label = 'Back',
  fallbackUrl = '/',
  className = '',
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 flex items-center justify-center transition-all active:scale-90 shadow-sm group ${className}`}
      title={label}
      aria-label={label}
    >
      <ArrowLeft
        size={18}
        className="text-amber-400 group-hover:-translate-x-0.5 transition-transform"
      />
    </button>
  );
};
