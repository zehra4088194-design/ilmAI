'use client';

import { useState } from 'react';
import { BookOpenText, Clock, Users, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuranCallRoom } from './QuranCallRoom';
import type { QuranGroupSummary } from '@/lib/quran/access';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function QuranTeacherView({ groups }: { groups: QuranGroupSummary[] }) {
  const [activeGroup, setActiveGroup] = useState<QuranGroupSummary | null>(null);

  if (activeGroup) {
    return (
      <QuranCallRoom
        groupId={activeGroup.id}
        groupName={activeGroup.name}
        role="teacher"
        onLeave={() => setActiveGroup(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BookOpenText className="text-emerald-500 h-6 w-6" /> Your Quran Groups
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Starting a call turns your camera on for every student in the group; you only ever see your own preview.
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={BookOpenText} title="No groups yet" description="Ask the platform admin to create a group for you." />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-muted-foreground flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {group.session_time} - {group.days_of_week.map((day) => DAY_LABELS[day - 1]).join(', ')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {group.member_count}/{group.max_students}
                    </span>
                  </p>
                </div>
                <Button variant="gradient" disabled={group.status !== 'active'} onClick={() => setActiveGroup(group)}>
                  <Video className="h-4 w-4" /> Start call
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
