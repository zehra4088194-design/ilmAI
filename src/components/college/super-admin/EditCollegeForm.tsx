"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CollegeFormFields } from "@/components/college/super-admin/CollegeFormFields";
import { updateCollege } from "@/lib/college/actions/super-admin";
import type { College } from "@/lib/college/types";

export function EditCollegeForm({ college }: { college: College }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateCollege(college.id, formData);
      if (result.success) {
        toast.success("Changes saved.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="glass space-y-5 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl"
    >
      <CollegeFormFields college={college} showCover />
      <Button type="submit" loading={isPending}>
        Save changes
      </Button>
    </form>
  );
}
