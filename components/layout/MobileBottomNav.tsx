'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Receipt, LayoutDashboard, History, Utensils, Settings } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'POS', icon: Receipt },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/bills', label: 'Bills', icon: History },
    { href: '/products', label: 'Menu', icon: Utensils },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-3 left-4 right-4 z-40">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl py-2 px-3 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-amber-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
                }`}
              >
                <Icon size={18} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
