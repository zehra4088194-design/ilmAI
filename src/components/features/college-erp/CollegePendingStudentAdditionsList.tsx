import { UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { reviewPendingCollegeStudentAddition } from '@/lib/college-erp/actions';
import type { PendingCollegeStudentAddition } from '@/lib/college-erp/queries';

// Mirrors src/components/features/school-erp/requests/PendingStudentAdditionsList.tsx.
export function CollegePendingStudentAdditionsList({ requests }: { requests: PendingCollegeStudentAddition[] }) {
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
        <div key={request.id} className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{request.extracted_name}</p>
              {request.extracted_roll_number && <Badge variant="outline">Roll {request.extracted_roll_number}</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Spotted in {request.section ? `${request.section.semesterName ? `${request.section.semesterName} - ` : ''}${request.section.name}` : 'a section'} on{' '}
              {new Date(request.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <CollegeActionForm action={reviewPendingCollegeStudentAddition} submitLabel="Approve" className="">
              <input type="hidden" name="id" value={request.id} />
              <input type="hidden" name="status" value="approved" />
            </CollegeActionForm>
            <CollegeActionForm action={reviewPendingCollegeStudentAddition} submitLabel="Reject" className="">
              <input type="hidden" name="id" value={request.id} />
              <input type="hidden" name="status" value="rejected" />
            </CollegeActionForm>
          </div>
        </div>
      ))}
    </div>
  );
}
