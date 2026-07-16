import Link from 'next/link';
import { Brain, Zap, FileText, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ACTIONS = [
  { icon: Brain, label: 'Ask AI Tutor', href: '/ai-tutor', color: 'from-violet-500 to-purple-600' },
  { icon: Zap, label: 'Quick Quiz', href: '/practice', color: 'from-blue-500 to-indigo-600' },
  { icon: FileText, label: 'Past Papers', href: '/past-papers', color: 'from-green-500 to-emerald-600' },
  { icon: Star, label: 'Flashcards', href: '/flashcards', color: 'from-amber-500 to-orange-600' },
];

export function QuickActions() {
  return (
    <Card className="dashboard-surface text-foreground">
      <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action, i) => (
          <Link key={i} href={action.href} className="flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-muted/35 p-4 text-center transition-colors hover:bg-muted/55">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium">{action.label}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
