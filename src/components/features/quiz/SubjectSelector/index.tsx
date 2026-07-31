'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

type Chapter = { id: string; name: string };

export function SubjectSelector({
  subjects,
  chaptersBySubject,
}: {
  subjects: any[];
  chaptersBySubject: Record<string, Chapter[]>;
}) {
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const startQuiz = async (subjectId: string, selectedChapterId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, chapterId: selectedChapterId, count: 10, difficulty: 'MEDIUM' }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      sessionStorage.setItem('current-quiz', JSON.stringify(json.data.session));
      router.push('/mcq/session');
    } catch {
      toast.error('The quiz could not be started.');
    } finally {
      setLoading(false);
    }
  };

  const openChapters = (subjectId: string) => {
    setChapterId(null);
    setOpenSubjectId(subjectId);
  };

  const selectedSubject = subjects.find((s) => s.id === openSubjectId);
  const chapters = openSubjectId ? chaptersBySubject[openSubjectId] || [] : [];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject, i) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className="h-full cursor-pointer transition-colors hover:border-violet-500/30"
              onClick={() => openChapters(subject.id)}
            >
              <CardContent className="p-5">
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${subject.color}20` }}
                >
                  <BookOpen className="h-5 w-5" style={{ color: subject.color }} />
                </div>
                <h3 className="mb-1 font-semibold">{subject.name}</h3>
                <p className="text-muted-foreground mb-4 text-xs">
                  {subject.total_chapters} chapters &middot; {subject.total_questions} questions
                </p>
                <Button
                  variant="gradient"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    openChapters(subject.id);
                  }}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Choose a chapter
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {subjects.length === 0 && (
          <div className="text-muted-foreground col-span-full py-12 text-center">
            No subjects are available yet. They will be added soon.
          </div>
        )}
      </div>

      <AnimatePresence>
        {openSubjectId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setOpenSubjectId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass border-border flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{selectedSubject?.name} &mdash; Choose a chapter</h3>
                <button onClick={() => setOpenSubjectId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {chapters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChapterId(c.id)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left text-sm transition-colors',
                      chapterId === c.id
                        ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                        : 'border-border hover:border-violet-500/40'
                    )}
                  >
                    {c.name}
                  </button>
                ))}
                {chapters.length === 0 && (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No chapters are currently available for this subject and class.
                  </p>
                )}
              </div>

              <Button
                variant="gradient"
                size="lg"
                className="mt-4 w-full"
                disabled={!chapterId || loading}
                onClick={() => chapterId && startQuiz(openSubjectId, chapterId)}
              >
                <Zap className="h-4 w-4" />
                {loading ? 'Starting...' : 'Start practice'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
