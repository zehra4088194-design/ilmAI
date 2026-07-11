import { Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/EmptyState";

interface RosterStudent {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export function StudentRosterTable({ students }: { students: RosterStudent[] }) {
  if (students.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No students yet"
        description="Approved students will appear here once you approve their join requests."
      />
    );
  }

  return (
    <div className="glass overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {student.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={student.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {(student.full_name || student.email || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="font-medium">{student.full_name ?? "—"}</span>
              </TableCell>
              <TableCell className="text-muted-foreground">{student.email ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
