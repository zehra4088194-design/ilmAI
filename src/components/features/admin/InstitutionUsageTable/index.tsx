'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Building2, Clock3, GraduationCap, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type InstitutionUsage = {
  institution_name: string;
  institution_type: string;
  student_count: number;
  active_students: number;
  total_study_minutes: number;
  total_quizzes: number;
  average_quiz_score: number | null;
  total_xp: number;
  plans: { FREE: number; PRO: number; ELITE: number };
};

export function InstitutionUsageTable() {
  const [items, setItems] = useState<InstitutionUsage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/institution-usage');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Usage load nahi hui');
      setItems(json.institutions || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Institution usage load nahi hui');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="text-primary h-5 w-5" /> Institution-wise usage
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Har sponsored school/college ka alag student count, active usage, study time, quiz performance aur plans.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {loading ? (
          <p className="text-muted-foreground p-6 text-sm">Usage load ho rahi hai...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">Abhi kisi school/college ko plan assign nahi hua.</p>
        ) : (
          <table className="w-full min-w-[950px] text-sm">
            <thead>
              <tr className="border-border border-y text-left">
                <th className="p-4">Institution</th>
                <th className="p-4">Students</th>
                <th className="p-4">Activity</th>
                <th className="p-4">Study time</th>
                <th className="p-4">Quizzes</th>
                <th className="p-4">Plans</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.institution_type}:${item.institution_name}`} className="border-border/50 border-b">
                  <td className="p-4">
                    <p className="flex items-center gap-2 font-semibold">
                      <Building2 className="text-primary h-4 w-4" />
                      {item.institution_name}
                    </p>
                    <p className="text-muted-foreground ml-6 flex items-center gap-1 text-xs capitalize">
                      <GraduationCap className="h-3 w-3" />
                      {item.institution_type}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold">{item.student_count}</p>
                    <p className="text-muted-foreground text-xs">{item.active_students} active / 30d</p>
                  </td>
                  <td className="p-4">
                    <p className="flex items-center gap-1 font-semibold">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      {item.total_xp.toLocaleString()} XP
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="flex items-center gap-1 font-semibold">
                      <Clock3 className="h-3.5 w-3.5 text-cyan-500" />
                      {Math.round(item.total_study_minutes).toLocaleString()} min
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold">{item.total_quizzes}</p>
                    <p className="text-muted-foreground text-xs">
                      Avg {item.average_quiz_score === null ? '—' : `${item.average_quiz_score}%`}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">Free {item.plans.FREE}</Badge>
                      <Badge variant="success">Pro {item.plans.PRO}</Badge>
                      <Badge variant="default">Elite {item.plans.ELITE}</Badge>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
