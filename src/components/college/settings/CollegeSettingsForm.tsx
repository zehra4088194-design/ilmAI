"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateCollegeSettings } from "@/lib/college/actions/settings";
import type { College } from "@/lib/college/types";

export function CollegeSettingsForm({ college }: { college: College }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateCollegeSettings(formData);
      if (result.success) {
        toast.success("Settings saved.");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="glass max-w-xl space-y-5 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
      {(college.logo_url || college.cover_url) && (
        <div className="flex items-center gap-4">
          {college.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={college.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
          )}
          {college.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={college.cover_url} alt="" className="h-14 w-24 rounded-xl object-cover" />
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="settings-name">College name</Label>
        <Input id="settings-name" name="name" required defaultValue={college.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="settings-description">Description</Label>
        <Textarea id="settings-description" name="description" rows={4} defaultValue={college.description ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="settings-logo">Logo</Label>
          <Input id="settings-logo" name="logo" type="file" accept="image/*" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-cover">Cover image</Label>
          <Input id="settings-cover" name="cover" type="file" accept="image/*" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        The college&apos;s URL slug and active/inactive status are managed by a super admin.
      </p>

      <Button type="submit" loading={isPending}>
        Save changes
      </Button>
    </form>
  );
}
