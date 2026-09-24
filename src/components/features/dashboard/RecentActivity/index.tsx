import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Brain, FileText, Star } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/format';

const ICON_MAP = { quiz: CheckCircle2, ai: Brain, paper: FileText, flashcard: Star };
const MOCK_ACTIVITY = [
  { type: 'quiz' as const, text: 'Physics MCQ Quiz completed - 85% score', time: new Date(Date.now() - 3600000).toISOString() },
  { type: 'ai' as const, text: 'AI Tutor session - Asked about Newton\'s Laws', time: new Date(Date.now() - 7200000).toISOString() },
  { type: 'flashcard' as const, text: 'Reviewed 20 Chemistry flashcards', time: new Date(Date.now() - 86400000).toISOString() },
];

export function RecentActivity({ userId }: { userId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {MOCK_ACTIVITY.map((activity, i) => {
          const Icon = ICON_MAP[activity.type];
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm">{activity.text}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.time)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
