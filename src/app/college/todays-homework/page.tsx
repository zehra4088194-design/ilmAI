'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Camera, Clock, FileText, Highlighter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CollegeTodaysHomeworkPage() {
  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/college/todays-homework');
        if (!response.ok) throw new Error('Failed to load homework');
        setHomework((await response.json()).homework || []);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    load();
    const timer = window.setInterval(load, 120000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) return <p className="p-8 text-muted-foreground">Loading today&apos;s homework...</p>;
  if (error) return <p className="p-8 text-destructive">{error}</p>;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Today&apos;s Homework</h1>
          <p className="text-sm text-muted-foreground">Assignments and lecture notes from your college.</p>
        </div>
      </div>
      {!homework.length ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No homework assigned for today.</CardContent></Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {homework.map((item) => (
            <Card key={item.homework_id} className="overflow-hidden border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />{item.due_at ? new Date(item.due_at).toLocaleString() : 'No deadline'}</Badge>
                  {item.section_name && <Badge variant="outline">{item.section_name}</Badge>}
                  {item.semester_name && <Badge variant="outline">{item.semester_name}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.instructions && <div><h3 className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" />Instructions</h3><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.instructions}</p></div>}
                {item.activity_type && <div className="space-y-2 rounded-lg bg-muted/50 p-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><Highlighter className="h-4 w-4" />Lecture Activity</h3><Badge variant={item.activity_type === 'test' ? 'default' : 'secondary'}>{item.activity_type === 'test' ? 'Test / Quiz' : 'Lesson Reading'}</Badge>{item.topic && <p className="text-sm"><span className="font-medium">Topic:</span> {item.topic}</p>}{item.summary && <p className="text-sm text-muted-foreground">{item.summary}</p>}{item.photo_url && <div className="overflow-hidden rounded-lg border"><img src={item.photo_url} alt="Annotated lecture" className="w-full object-cover" /></div>}</div>}
                {item.course_name && <p className="text-sm"><span className="font-medium">Course:</span> {item.course_name}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
