'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check local session authentication
    const token = localStorage.getItem('sushi_hotel_auth_token');
    const isAuthed = Boolean(token);
    setIsAuthenticated(isAuthed);

    if (!isAuthed && !isLoginPage) {
      router.replace('/login');
    } else if (isAuthed && isLoginPage) {
      router.replace('/');
    }
  }, [pathname, isLoginPage, router]);

  // If on login page: show ONLY the dedicated, pristine login screen without any nav bars
  if (isLoginPage) {
    return <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">{children}</main>;
  }

  // During initial session check, prevent flashing
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Protected application layout with sleek, minimal navigation
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      <div className="no-print">
        <Navbar />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden pb-16 xl:pb-0">
        {children}
      </main>

      <div className="no-print">
        <MobileBottomNav />
      </div>
    </div>
  );
};
