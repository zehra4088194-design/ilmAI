"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { College } from "@/lib/college/types";

/**
 * Shared name/slug/city/description/logo(+cover) fields for both
 * /admin/colleges/new and /admin/colleges/[id]. `showSlug` is on for both —
 * slug is editable at creation and, per spec, super admins may also edit it
 * later (only college admins are blocked from touching it — see
 * CollegeSettingsForm). `showCover` is off for the create form (spec only
 * asks for a logo upload at creation time) and on for the edit form.
 */
export function CollegeFormFields({
  college,
  showCover = false,
}: {
  college?: Pick<College, "name" | "slug" | "city" | "description" | "logo_url" | "cover_url"> | null;
  showCover?: boolean;
}) {
  const [name, setName] = useState(college?.name ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(college?.slug));
  const [slug, setSlug] = useState(college?.slug ?? "");

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(
        value
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="college-name">Name</Label>
        <Input id="college-name" name="name" required value={name} onChange={(e) => handleNameChange(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="college-slug">URL slug</Label>
        <Input
          id="college-slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Shown as /colleges/{slug || "your-slug"}. Lowercase letters, numbers and hyphens only.
          {college && " Changing this changes the college's public URL."}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="college-city">City</Label>
        <Input id="college-city" name="city" defaultValue={college?.city ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="college-description">Description</Label>
        <Textarea id="college-description" name="description" rows={4} defaultValue={college?.description ?? ""} />
      </div>

      <div className={showCover ? "grid grid-cols-2 gap-4" : ""}>
        <div className="space-y-1.5">
          <Label htmlFor="college-logo">Logo</Label>
          <Input id="college-logo" name="logo" type="file" accept="image/*" />
        </div>
        {showCover && (
          <div className="space-y-1.5">
            <Label htmlFor="college-cover">Cover image</Label>
            <Input id="college-cover" name="cover" type="file" accept="image/*" />
          </div>
        )}
      </div>
    </div>
  );
}
