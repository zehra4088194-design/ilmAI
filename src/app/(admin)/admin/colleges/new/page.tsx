"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CollegeFormFields } from "@/components/college/super-admin/CollegeFormFields";
import { createCollege } from "@/lib/college/actions/super-admin";

export default function NewCollegePage() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCollege(formData);
      if (result.success && result.data) {
        toast.success("College created.");
        router.push(`/admin/colleges/${result.data.id}`);
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-bold">Add College</h1>
      <form action={handleSubmit} className="glass space-y-5 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
        <CollegeFormFields />
        <Button type="submit" loading={isPending}>
          Create college
        </Button>
      </form>
    </div>
  );
}
