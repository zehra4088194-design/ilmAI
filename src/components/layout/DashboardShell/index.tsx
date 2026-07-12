'use client';

import { useState, type ReactNode } from 'react';
import { DashboardNavbar } from '@/components/layout/DashboardNavbar';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { SideChatWidget } from '@/components/features/ai-selector/SideChatWidget';

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        <DashboardNavbar mobileMenuOpen={mobileMenuOpen} onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 mt-16">{children}</main>
      </div>
      <SideChatWidget />
    </div>
  );
}
