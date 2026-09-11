'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Camera, Clock, FileText, Highlighter, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Student "Today's Homework" Page
 * Shows today's homework assignments along with any lecture annotations
 * (photos with highlights, activity type, topic) that the teacher added.
 */
export default function TodaysHomeworkPage() {
  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHomework = async () => {
      try {
        const res = await fetch('/api/student/todays-homework');
        if (!res.ok) throw new Error('Failed to load homework');
        const data = await res.json();
        setHomework(data.homework || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    loadHomework();
    // Poll every 2 minutes for updates
    const timer = setInterval(loadHomework, 120000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading today's homework...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (homework.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground text-lg">No homework assigned for today!</p>
        <p className="text-muted-foreground text-sm">Check back later or contact your teacher.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Today's Homework</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {homework.map((item) => (
          <Card key={item.homework_id} className="overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {item.due_at ? new Date(item.due_at).toLocaleString('en-PK') : 'No deadline'}
                    </Badge>
                    {item.section_name && (
                      <Badge variant="outline">{item.section_name}</Badge>
                    )}
                    {item.class_name && (
                      <Badge variant="outline">{item.class_name}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Instructions */}
              {item.instructions && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4" />
                    Instructions
                  </h3>
                  <p className="text-muted-foreground whitespace-pre-wrap text-sm">{item.instructions}</p>
                </div>
              )}

              {/* Lecture Annotation */}
              {item.activity_type && (
                <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Highlighter className="h-4 w-4" />
                    Lecture Activity
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={item.activity_type === 'test' ? 'default' : 'secondary'}
                      className="gap-1"
                    >
                      {item.activity_type === 'test' ? '📝 Test / Quiz' : '📖 Lesson Reading'}
                    </Badge>
                    {item.highlight_color && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `${item.highlight_color}20`,
                          color: item.highlight_color,
                          border: `1px solid ${item.highlight_color}40`,
                        }}
                      >
                        <Highlighter className="h-3 w-3" />
                        {item.highlight_color}
                      </span>
                    )}
                  </div>

                  {item.topic && (
                    <p className="text-sm">
                      <span className="font-medium">Topic:</span> {item.topic}
                    </p>
                  )}

                  {item.summary && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Summary:</p>
                      <p className="text-muted-foreground text-sm">{item.summary}</p>
                    </div>
                  )}

                  {/* Photo with highlight */}
                  {item.photo_url && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-2 text-xs font-semibold">
                        <Camera className="h-3 w-3" />
                        Annotated Photo
                      </h4>
                      <div className="relative overflow-hidden rounded-lg border">
                        <img
                          src={item.photo_url}
                          alt="Annotated homework"
                          className="w-full object-cover"
                          style={{ maxHeight: '300px' }}
                        />
                        {item.highlight_color && (
                          <div
                            className="pointer-events-none absolute inset-0 ring-1 ring-inset"
                            style={{
                              boxShadow: `0 0 0 9999px ${item.highlight_color}15`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Subject */}
              {item.subject_name && (
                <div className="text-sm">
                  <span className="font-medium">Subject:</span> {item.subject_name}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
