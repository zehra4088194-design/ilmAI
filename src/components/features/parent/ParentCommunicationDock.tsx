'use client';

import { MessageCircle, Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParentMessageThread } from '@/components/ui/ParentMessageThread';

type ParentCommunicationStudent = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type ParentCommunicationLink = {
  id: string;
  student: ParentCommunicationStudent | null;
};

export function ParentCommunicationDock({
  parentId,
  links,
}: {
  parentId: string;
  links: ParentCommunicationLink[];
}) {
  const pathname = usePathname();
  if (pathname !== '/parent') return null;

  const approved = links.filter((link) => link.student);
  if (!approved.length) return null;

  return (
    <Card className="border-violet-500/20 bg-violet-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-violet-400" /> Family communication
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Your linked children can always message you here, and you can call them directly.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {approved.map((link) => (
          <div key={link.id} className="rounded-xl border bg-background/40 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
                {link.student?.avatar_url ? (
                  <img src={link.student.avatar_url} alt={link.student.full_name || 'Student'} className="h-full w-full object-cover" />
                ) : (
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{link.student?.full_name || 'Linked student'}</p>
                <p className="text-muted-foreground text-[11px]">Direct parent connection</p>
              </div>
            </div>
            <ParentMessageThread linkId={link.id} currentUserId={parentId} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
