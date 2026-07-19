'use client';

import { useState, type ReactNode } from 'react';
import { DashboardNavbar } from '@/components/layout/DashboardNavbar';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { SideChatWidget } from '@/components/features/ai-selector/SideChatWidget';
import { DataRetentionNotice } from '@/components/features/privacy/DataRetentionNotice';

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-dvh min-w-0 overflow-x-clip">
      <DashboardSidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:ml-64">
        <DashboardNavbar mobileMenuOpen={mobileMenuOpen} onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)} />
        <main className="mt-16 min-w-0 flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
          <DataRetentionNotice />
          {children}
        </main>
      </div>
      <SideChatWidget />
    </div>
  );
}
