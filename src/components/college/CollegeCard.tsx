import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PublicCollege, StudentCollegeState } from "@/lib/college/types";
import { CollegeRequestButton } from "@/components/college/CollegeRequestButton";

interface CollegeCardProps {
  college: PublicCollege;
  studentStatus: StudentCollegeState;
  userId: string | null;
}

export function CollegeCard({ college, studentStatus, userId }: CollegeCardProps) {
  return (
    <div
      className={cn(
        "glass flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl transition-shadow hover:shadow-md"
      )}
    >
      <Link href={`/colleges/${college.slug}`} className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
          {college.logo_url ? (
            // Plain <img> on purpose — see MODULE_SUMMARY.md (low-bandwidth default,
            // avoids requiring a next.config.ts remotePatterns change).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={college.logo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-muted-foreground">{college.name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-tight">{college.name}</h3>
          {college.city && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{college.city}</span>
            </p>
          )}
        </div>
      </Link>

      {college.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{college.description}</p>
      )}

      <div className="mt-auto pt-1">
        <CollegeRequestButton
          collegeId={college.id}
          collegeSlug={college.slug}
          studentStatus={studentStatus}
          userId={userId}
          className="w-full"
        />
      </div>
    </div>
  );
}
