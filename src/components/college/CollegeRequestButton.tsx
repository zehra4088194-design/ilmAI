"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelJoinRequest, requestToJoinCollege } from "@/lib/college/actions/join-requests";
import type { StudentCollegeState } from "@/lib/college/types";

interface CollegeRequestButtonProps {
  collegeId: string;
  collegeSlug: string;
  studentStatus: StudentCollegeState;
  userId: string | null;
  className?: string;
}

/**
 * Renders one of: "Request to Join" / "Pending" (+ cancel) / "View" — per
 * spec — plus a disabled "Request to Join" when the student already has an
 * active request with a *different* college (a student can only have one
 * active request system-wide, enforced by the DB's partial unique index).
 */
export function CollegeRequestButton({
  collegeId,
  collegeSlug,
  studentStatus,
  userId,
  className,
}: CollegeRequestButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!userId) {
    return (
      <Button asChild size="sm" className={className}>
        <Link href={`/login?redirect=${encodeURIComponent(`/colleges/${collegeSlug}`)}`}>Request to Join</Link>
      </Button>
    );
  }

  if (studentStatus.state === "approved" && studentStatus.collegeId === collegeId) {
    return (
      <Button asChild size="sm" variant="outline" className={className}>
        <Link href="/college/dashboard">View My College</Link>
      </Button>
    );
  }

  if (studentStatus.state === "pending" && studentStatus.collegeId === collegeId) {
    return (
      <div className={className}>
        <Button size="sm" variant="outline" className="w-full" disabled>
          Pending approval
        </Button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelJoinRequest(studentStatus.requestId, collegeSlug);
              if (result.success) {
                toast.success("Request cancelled.");
                router.refresh();
              } else {
                toast.error(result.error ?? "Could not cancel the request.");
              }
            })
          }
          className="mt-1 w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
        >
          Cancel request
        </button>
      </div>
    );
  }

  // Student has an active request with a *different* college.
  if (studentStatus.state !== "none") {
    return (
      <Button size="sm" className={className} disabled title="You already have an active request with a college">
        Request to Join
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className={className}
      loading={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await requestToJoinCollege(collegeId, collegeSlug);
          if (result.success) {
            toast.success("Request sent! The college admin will review it soon.");
            router.refresh();
          } else {
            toast.error(result.error ?? "Could not send the request.");
          }
        })
      }
    >
      Request to Join
    </Button>
  );
}
