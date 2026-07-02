import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BookOpen, MessageSquare, TrendingUp } from 'lucide-react';
export const metadata: Metadata = { title: 'Admin Overview' };

export default async function AdminOverviewPage() {
  const supabase = await createAdminClient();
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: proUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('subscription_tier', 'FREE');
  const { count: totalQuestions } = await supabase.from('questions').select('*', { count: 'exact', head: true });

  const stats = [
    { icon: Users, label: 'Total Users', value: totalUsers || 0, color: 'text-violet-400' },
    { icon: TrendingUp, label: 'Pro/Elite Users', value: proUsers || 0, color: 'text-green-400' },
    { icon: BookOpen, label: 'Total Questions', value: totalQuestions || 0, color: 'text-blue-400' },
    { icon: MessageSquare, label: 'AI Messages Today', value: '—', color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}><CardContent className="p-5">
            <stat.icon className={`w-6 h-6 mb-2 ${stat.color}`} />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
