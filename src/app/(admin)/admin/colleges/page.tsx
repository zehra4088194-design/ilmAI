import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllCollegesForSuperAdmin } from "@/lib/college/queries";
import { CollegesTable } from "@/components/college/super-admin/CollegesTable";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Colleges | Admin | ilm AI" };

export default async function AdminCollegesPage() {
  const supabase = await createClient();
  const colleges = await getAllCollegesForSuperAdmin(supabase);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Colleges</h1>
        <Button asChild>
          <Link href="/admin/colleges/new">
            <Plus className="h-4 w-4" />
            Add College
          </Link>
        </Button>
      </div>
      <CollegesTable colleges={colleges} />
    </div>
  );
}
