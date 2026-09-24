'use client';

import { useState } from 'react';
import { BookOpenText, Clock, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuranCallRoom } from './QuranCallRoom';
import type { QuranStudentGroup } from '@/lib/quran/access';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function QuranStudentView({ groups }: { groups: QuranStudentGroup[] }) {
  const [activeGroup, setActiveGroup] = useState<QuranStudentGroup | null>(null);

  if (activeGroup) {
    return (
      <QuranCallRoom
        groupId={activeGroup.id}
        groupName={activeGroup.name}
        role="student"
        onLeave={() => setActiveGroup(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BookOpenText className="text-emerald-500 h-6 w-6" /> Quran Class
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Join your live morning recitation session. Your teacher's video shows on screen — you join by voice.
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={BookOpenText}
          title="No Quran class yet"
          description="Ask your parent or the platform admin to add you to a group."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    {group.session_time} - {group.days_of_week.map((day) => DAY_LABELS[day - 1]).join(', ')} - with{' '}
                    {group.teacher_name}
                  </p>
                </div>
                <Button
                  variant="gradient"
                  disabled={group.status !== 'active'}
                  onClick={() => setActiveGroup(group)}
                >
                  <Phone className="h-4 w-4" /> Join
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
