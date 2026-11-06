import React from 'react';

interface SushiLogoProps {
  variant?: 'full' | 'compact' | 'monochrome' | 'receipt';
  className?: string;
  size?: number;
  showSubtitle?: boolean;
}

export const SushiLogo: React.FC<SushiLogoProps> = ({
  variant = 'full',
  className = '',
  size = 40,
  showSubtitle = true,
}) => {
  if (variant === 'monochrome' || variant === 'receipt') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <svg
          width={size * 1.2}
          height={size * 1.2}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Ring */}
          <circle cx="50" cy="50" r="46" stroke="#000000" strokeWidth="4" />
          <circle cx="50" cy="50" r="41" stroke="#000000" strokeWidth="1" strokeDasharray="3 3" />
          
          {/* Chef Hat & Steaming Cloche Emblem */}
          <path
            d="M32 62h36c2 0 3-1 3-3 0-8-5-14-11-16 2-3 2-7 0-10-3-4-8-5-10-5-2 0-7 1-10 5-2 3-2 7 0 10-6 2-11 8-11 16 0 2 1 3 3 3z"
            fill="#000000"
          />
          <path d="M30 68h40v4H30z" fill="#000000" />
          <path d="M35 75h30v2H35z" fill="#000000" />
          
          {/* Utensils / Stars */}
          <circle cx="28" cy="46" r="2.5" fill="#000000" />
          <circle cx="72" cy="46" r="2.5" fill="#000000" />
        </svg>
        <span className="font-black tracking-widest text-black text-xl uppercase mt-1">
          SUSHI HOTEL
        </span>
        {showSubtitle && (
          <span className="text-[11px] font-bold tracking-wider text-black uppercase mt-0.5">
            PADALUR • OOTTATHUR ROAD
          </span>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          <defs>
            <linearGradient id="sushiGradCompact" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="innerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#innerGlow)" stroke="url(#sushiGradCompact)" strokeWidth="3" />
          <circle cx="50" cy="50" r="42" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
          
          {/* Golden Crown / Chef Hat Cloche */}
          <path
            d="M34 62h32c2 0 3-1 3-3 0-8-5-14-10-16 2-3 2-7 0-10-3-4-7-5-9-5-2 0-6 1-9 5-2 3-2 7 0 10-5 2-10 8-10 16 0 2 1 3 3 3z"
            fill="url(#sushiGradCompact)"
          />
          <rect x="32" y="66" width="36" height="4" rx="2" fill="#ffffff" />
          <circle cx="50" cy="22" r="3.5" fill="#f59e0b" />
        </svg>
      </div>
    );
  }

  // Full Color Brand Logo
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          <defs>
            <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#bgGrad)" stroke="url(#brandGrad)" strokeWidth="3" />
          <circle cx="50" cy="50" r="42" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
          
          {/* Cloche & Chef toque */}
          <path
            d="M34 62h32c2 0 3-1 3-3 0-8-5-14-10-16 2-3 2-7 0-10-3-4-7-5-9-5-2 0-6 1-9 5-2 3-2 7 0 10-5 2-10 8-10 16 0 2 1 3 3 3z"
            fill="url(#brandGrad)"
          />
          <rect x="32" y="66" width="36" height="4" rx="2" fill="#ffffff" />
          <circle cx="50" cy="22" r="3.5" fill="#f59e0b" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold tracking-wider text-white text-lg sm:text-xl font-heading leading-tight">
            SUSHI <span className="text-amber-400">HOTEL</span>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider">
            POS
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[11px] font-medium tracking-wide text-slate-400 leading-tight">
            PADALUR • OOTTATHUR ROAD
          </span>
        )}
      </div>
    </div>
  );
};
