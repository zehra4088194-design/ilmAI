import { UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { reviewPendingStudentAddition } from '@/lib/school-erp/actions';
import type { PendingStudentAddition } from '@/lib/school-erp/queries';

/**
 * "New student detected" approval queue from the attendance-scan pipeline (Part 4.2 point 5) —
 * server-rendered list + SchoolActionForm buttons, same pattern as the leave-requests list on
 * /school-admin/attendance, rather than SchoolJoinRequestList's client-side useTransition style
 * (that one predates this component and manages its own optimistic local list state; not worth
 * introducing a second dependency here for a simple approve/reject).
 */
export function PendingStudentAdditionsList({ requests }: { requests: PendingStudentAddition[] }) {
  if (!requests.length) {
    return (
      <EmptyState
        icon={UserPlus}
        title="No new students detected"
        description="Names the attendance scanner can't match to an enrolled student will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{request.extracted_name}</p>
              {request.extracted_roll_number && <Badge variant="outline">Roll {request.extracted_roll_number}</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Spotted in {request.section ? `${request.section.className ? `${request.section.className} - ` : ''}${request.section.name}` : 'a section'} on{' '}
              {new Date(request.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <SchoolActionForm action={reviewPendingStudentAddition} submitLabel="Approve" className="">
              <input type="hidden" name="id" value={request.id} />
              <input type="hidden" name="status" value="approved" />
            </SchoolActionForm>
            <SchoolActionForm action={reviewPendingStudentAddition} submitLabel="Reject" className="">
              <input type="hidden" name="id" value={request.id} />
              <input type="hidden" name="status" value="rejected" />
            </SchoolActionForm>
          </div>
        </div>
      ))}
    </div>
  );
}
