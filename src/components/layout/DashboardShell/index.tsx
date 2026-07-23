'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { DashboardNavbar } from '@/components/layout/DashboardNavbar';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { SideChatWidget } from '@/components/features/ai-selector/SideChatWidget';
import { DataRetentionNotice } from '@/components/features/privacy/DataRetentionNotice';

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [desktopAutoCloseEnabled, setDesktopAutoCloseEnabled] = useState(true);

  useEffect(() => {
    if (!desktopSidebarOpen || !desktopAutoCloseEnabled) return;
    const timer = window.setTimeout(() => {
      setDesktopSidebarOpen(false);
      setDesktopAutoCloseEnabled(false);
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [desktopAutoCloseEnabled, desktopSidebarOpen]);

  const setDesktopSidebar = (open: boolean) => {
    setDesktopAutoCloseEnabled(false);
    setDesktopSidebarOpen(open);
  };
  const toggleDesktopSidebar = () => {
    setDesktopAutoCloseEnabled(false);
    setDesktopSidebarOpen((open) => !open);
  };

  return (
    <div className="bg-background flex min-h-dvh min-w-0 overflow-x-clip">
      <DashboardSidebar
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
        desktopOpen={desktopSidebarOpen}
        onDesktopOpenChange={setDesktopSidebar}
      />
      <div className={`flex min-h-dvh min-w-0 flex-1 flex-col transition-[margin] duration-300 ${desktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <DashboardNavbar
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
          desktopSidebarOpen={desktopSidebarOpen}
          onToggleDesktopSidebar={toggleDesktopSidebar}
        />
        <main className="mt-16 min-w-0 flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
          <DataRetentionNotice />
          {children}
        </main>
      </div>
      <SideChatWidget />
    </div>
  );
}
