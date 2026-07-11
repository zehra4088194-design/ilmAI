import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Deadline = {
  reminder_date: string | null;
  opportunities?: { title?: string | null; deadline?: string | null } | null;
};

export function OpportunityDeadlinesCard({ deadlines }: { deadlines: Deadline[] }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-violet-400" />
        <h2 className="font-bold">Deadlines coming up</h2>
      </div>
      {deadlines.length ? (
        <div className="space-y-2">
          {deadlines.slice(0, 3).map((item, index) => (
            <div key={`${item.opportunities?.title}-${index}`} className="rounded-lg border p-2 text-sm">
              <p className="font-medium">{item.opportunities?.title || 'Saved opportunity'}</p>
              <p className="text-xs text-muted-foreground">Reminder {item.reminder_date || item.opportunities?.deadline}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Bookmark opportunities to track reminders here.</p>
      )}
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href="/opportunities">Browse opportunities</Link>
      </Button>
    </div>
  );
}
