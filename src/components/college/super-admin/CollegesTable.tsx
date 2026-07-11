"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toggleCollegeActive } from "@/lib/college/actions/super-admin";
import type { CollegeWithAdmin } from "@/lib/college/types";

export function CollegesTable({ colleges }: { colleges: CollegeWithAdmin[] }) {
  const [rows, setRows] = useState(colleges);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setRows(colleges);
  }, [colleges]);

  function handleToggle(college: CollegeWithAdmin) {
    setPendingId(college.id);
    startTransition(async () => {
      const result = await toggleCollegeActive(college.id, !college.is_active);
      setPendingId(null);
      if (result.success) {
        setRows((prev) => prev.map((c) => (c.id === college.id ? { ...c, is_active: !c.is_active } : c)));
        toast.success(college.is_active ? "College deactivated." : "College activated.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No colleges yet"
        description="Add your first college to start onboarding students."
        primaryHref="/admin/colleges/new"
        primaryLabel="Add College"
      />
    );
  }

  return (
    <div className="glass overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>College</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((college) => (
            <TableRow key={college.id}>
              <TableCell className="font-medium">{college.name}</TableCell>
              <TableCell className="text-muted-foreground">{college.city ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {college.admin ? college.admin.full_name || college.admin.email : "Unassigned"}
              </TableCell>
              <TableCell>
                <Badge variant={college.is_active ? "default" : "secondary"}>
                  {college.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-end">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" disabled={pendingId === college.id} onClick={() => handleToggle(college)}>
                    {college.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="icon-sm" variant="ghost" asChild>
                    <Link href={`/admin/colleges/${college.id}`} aria-label="Edit college">
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
