"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { assignCollegeAdmin, removeCollegeAdmin } from "@/lib/college/actions/super-admin";

interface AssignCollegeAdminFormProps {
  collegeId: string;
  currentAdmin: { full_name: string | null; email: string | null } | null;
}

export function AssignCollegeAdminForm({ collegeId, currentAdmin }: AssignCollegeAdminFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    startTransition(async () => {
      const result = await assignCollegeAdmin(collegeId, email);
      if (result.success) {
        toast.success("College admin assigned.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not assign this admin.");
      }
    });
  }

  function handleRemove() {
    if (!confirm("Remove this college's admin?")) return;
    startTransition(async () => {
      const result = await removeCollegeAdmin(collegeId);
      if (result.success) {
        toast.success("Admin removed.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not remove the admin.");
      }
    });
  }

  return (
    <div className="glass space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
      <div>
        <p className="text-sm font-medium">Current admin</p>
        <p className="text-sm text-muted-foreground">
          {currentAdmin ? currentAdmin.full_name || currentAdmin.email : "No admin assigned yet"}
        </p>
      </div>

      <form action={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="admin-email">{currentAdmin ? "Reassign to email" : "Assign by email"}</Label>
          <Input id="admin-email" name="email" type="email" required placeholder="admin@example.com" />
        </div>
        <Button type="submit" loading={isPending}>
          {currentAdmin ? "Reassign" : "Assign"}
        </Button>
      </form>

      {currentAdmin && (
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleRemove}>
          Remove admin
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        The person must already have an ilm AI account with this email. Assigning a new admin replaces the current one.
      </p>
    </div>
  );
}
