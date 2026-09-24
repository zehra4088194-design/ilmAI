'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Plus, Target, Trash2 } from 'lucide-react';

export interface FamilyGoal {
  id: string;
  student_id: string;
  title: string;
  target_value: number;
  unit: string;
  progress_value: number;
  due_date: string | null;
  status: 'active' | 'done' | 'archived';
}

interface FamilyGoalsProps {
  students: { id: string; full_name: string }[];
  goals: FamilyGoal[];
}

export function FamilyGoals({ students, goals }: FamilyGoalsProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [dueDate, setDueDate] = useState('');

  const createGoal = async () => {
    if (!studentId || !title.trim()) {
      toast.error('Pick a student and enter a goal title.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/parent/family-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, title, targetValue, unit, dueDate: dueDate || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'The goal could not be created.');
        return;
      }
      toast.success('Family goal added.');
      setTitle('');
      setTargetValue('');
      setUnit('');
      setDueDate('');
      setShowForm(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const updateGoal = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/parent/family-goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error('The goal could not be updated.');
      return;
    }
    router.refresh();
  };

  const deleteGoal = async (id: string) => {
    const res = await fetch(`/api/parent/family-goals/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('The goal could not be deleted.');
      return;
    }
    toast.success('Goal removed.');
    router.refresh();
  };

  const activeGoals = goals.filter((goal) => goal.status !== 'archived');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-violet-400" /> Family Goals
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowForm((value) => !value)}>
          <Plus className="h-3.5 w-3.5" /> Add goal
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="bg-muted/20 space-y-2 rounded-xl border p-3">
            <select
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
            <Input placeholder="Goal title (e.g. Finish Physics Ch.5)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Target (e.g. 100)"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
              <Input placeholder="Unit (e.g. XP, quizzes)" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <Button variant="gradient" size="sm" className="w-full" onClick={createGoal} loading={saving}>
              Save goal
            </Button>
          </div>
        )}

        {activeGoals.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">No family goals yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {activeGoals.map((goal) => {
              const student = students.find((s) => s.id === goal.student_id);
              const pct = goal.target_value > 0 ? Math.min(100, Math.round((goal.progress_value / goal.target_value) * 100)) : 0;
              const overdue = !!goal.due_date && goal.due_date < new Date().toISOString().slice(0, 10) && goal.status === 'active';
              return (
                <div key={goal.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{goal.title}</p>
                      <p className="text-muted-foreground text-xs">{student?.full_name || 'Student'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {goal.status === 'done' ? (
                        <Badge className="bg-green-600">Done</Badge>
                      ) : overdue ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : null}
                      {goal.status === 'active' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateGoal(goal.id, { status: 'done' })}>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteGoal(goal.id)}>
                        <Trash2 className="text-muted-foreground h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {goal.target_value > 0 && (
                    <div className="mt-2">
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div className={cn('h-full rounded-full', goal.status === 'done' ? 'bg-green-500' : 'bg-violet-500')} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        {goal.progress_value} / {goal.target_value} {goal.unit} · {pct}%
                        {goal.due_date && ` · due ${new Date(`${goal.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
