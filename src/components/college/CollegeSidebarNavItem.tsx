"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { useCollegeStatus } from "@/hooks/useCollegeStatus";

interface CollegeSidebarNavItemProps {
  userId: string | null | undefined;
  /** Pass the sidebar's own `isActive(href)` so the highlighted state matches its other links exactly. */
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}

/**
 * Renders nothing when the student has no College Portal activity yet
 * (state "none"), a disabled "Pending approval" row while a request is
 * outstanding, or a normal nav link to /college/dashboard once approved.
 *
 * Designed to be dropped straight into DashboardSidebar's nav list — see
 * MODULE_SUMMARY.md for the exact insertion point/snippet.
 */
export function CollegeSidebarNavItem({ userId, isActive, onNavigate }: CollegeSidebarNavItemProps) {
  const { status } = useCollegeStatus(userId ?? null);

  if (status.state === "none") return null;

  const active = isActive("/college/dashboard");

  return (
    <div>
      <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
        College
      </p>
      {status.state === "pending" ? (
        <div className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/40">
          <GraduationCap className="h-4 w-4 shrink-0" />
          <span className="flex-1">My College</span>
          <Badge className="shrink-0 bg-amber-600 px-1.5 py-0 text-[10px] text-white">Pending</Badge>
        </div>
      ) : (
        <Link
          href="/college/dashboard"
          onClick={onNavigate}
          className={cn(
            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            active
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <GraduationCap
            className={cn(
              "h-4 w-4 shrink-0",
              active ? "text-violet-400" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
            )}
          />
          <span className="flex-1">My College</span>
        </Link>
      )}
    </div>
  );
}
