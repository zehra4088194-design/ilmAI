'use client';

import { useState } from 'react';
import { BookOpenText, Clock, Save, Users, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { QuranCallRoom } from './QuranCallRoom';
import type { QuranGroupSummary } from '@/lib/quran/access';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function LessonEditor({ groupId }: { groupId: string }) {
  const [lesson, setLesson] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/quran/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, lesson }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Could not save the lesson.');
        return;
      }
      toast.success("Today's lesson updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Today's Surah / lesson (shown to students)"
        value={lesson}
        onChange={(e) => setLesson(e.target.value)}
        className="h-9 text-sm"
      />
      <Button variant="outline" size="sm" onClick={save} loading={saving}>
        <Save className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

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
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
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
                </div>
                <LessonEditor groupId={group.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
