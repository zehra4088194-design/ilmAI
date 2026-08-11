'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Inbox, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { approveJoinRequest, declineJoinRequest } from '@/lib/school-erp/join-requests';
import type { SchoolJoinRequestWithRequester } from '@/lib/school-erp/types';

export function SchoolJoinRequestList({ initialRequests }: { initialRequests: SchoolJoinRequestWithRequester[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  function resolve(requestId: string, action: 'approve' | 'decline') {
    setPendingId(requestId);
    startTransition(async () => {
      const result = action === 'approve' ? await approveJoinRequest(requestId) : await declineJoinRequest(requestId);
      setPendingId(null);
      if (result.success) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        toast.success(action === 'approve' ? 'Request approved.' : 'Request declined.');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Something went wrong.');
      }
    });
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No pending requests"
        description="New join requests from students and teachers will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="glass flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {request.requester?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={request.requester.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">
                  {(request.requester?.full_name || request.requester?.email || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{request.requester?.full_name ?? 'Unknown user'}</p>
              <p className="truncate text-xs text-muted-foreground">{request.requester?.email}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {request.role_requested}
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pendingId === request.id}
              onClick={() => resolve(request.id, 'decline')}
            >
              <X className="h-4 w-4" />
              Decline
            </Button>
            <Button size="sm" disabled={pendingId === request.id} onClick={() => resolve(request.id, 'approve')}>
              <Check className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
