'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { DashboardNavbar } from '@/components/layout/DashboardNavbar';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardFooter } from '@/components/layout/DashboardFooter';
import { SideChatWidget } from '@/components/features/ai-selector/SideChatWidget';
import { FeatureTour } from '@/components/features/onboarding/FeatureTour';
import type { InstitutionBranding } from '@/lib/branding/resolveInstitutionBranding';

export function DashboardShell({ children, branding }: { children: ReactNode; branding?: InstitutionBranding | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [desktopSidebarHovered, setDesktopSidebarHovered] = useState(false);
  const [featureTourOpen, setFeatureTourOpen] = useState(false);

  useEffect(() => {
    if (!desktopSidebarOpen || desktopSidebarHovered || featureTourOpen) return;

    const timer = window.setTimeout(() => {
      setDesktopSidebarOpen(false);
    }, 10_000);

    return () => window.clearTimeout(timer);
  }, [desktopSidebarHovered, desktopSidebarOpen, featureTourOpen]);

  const setDesktopSidebar = (open: boolean) => {
    setDesktopSidebarOpen(open);
  };
  const toggleDesktopSidebar = () => {
    setDesktopSidebarOpen((open) => !open);
  };

  return (
    <div className="bg-background flex min-h-dvh min-w-0 overflow-x-clip">
      <DashboardSidebar
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
        desktopOpen={desktopSidebarOpen}
        onDesktopOpenChange={setDesktopSidebar}
        onDesktopHoverChange={setDesktopSidebarHovered}
        branding={branding}
      />
      <div className={`flex min-h-dvh min-w-0 flex-1 flex-col transition-[margin] duration-300 ${desktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <DashboardNavbar
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
          desktopSidebarOpen={desktopSidebarOpen}
          onToggleDesktopSidebar={toggleDesktopSidebar}
        />
        <main className="mt-16 min-w-0 flex-1 p-3 pb-24 sm:p-4 sm:pb-6 md:p-6 lg:p-8">
          {children}
        </main>
        <DashboardFooter />
      </div>
      <SideChatWidget />
      <FeatureTour
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuChange={setMobileMenuOpen}
        onTourOpenChange={setFeatureTourOpen}
      />
    </div>
  );
}
