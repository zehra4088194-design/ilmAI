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
  subjects, chaptersBySubject,
}: { subjects: any[]; chaptersBySubject: Record<string, Chapter[]> }) {
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const startQuiz = async (subjectId: string, selectedChapterId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, chapterIds: [selectedChapterId], count: 10, difficulty: 'MEDIUM' }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      sessionStorage.setItem('current-quiz', JSON.stringify(json.data));
      router.push('/mcq/session');
    } catch {
      toast.error('Quiz start nahi ho saka');
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
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject, i) => (
          <motion.div key={subject.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:border-violet-500/30 transition-colors cursor-pointer h-full" onClick={() => openChapters(subject.id)}>
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${subject.color}20` }}>
                  <BookOpen className="w-5 h-5" style={{ color: subject.color }} />
                </div>
                <h3 className="font-semibold mb-1">{subject.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">{subject.total_chapters} chapters &middot; {subject.total_questions} questions</p>
                <Button variant="gradient" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); openChapters(subject.id); }}>
                  <Zap className="w-3.5 h-3.5" />Chapter Choose Karo
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {subjects.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">Koi subjects available nahi hain abhi. Jald hi add honge!</div>
        )}
      </div>

      <AnimatePresence>
        {openSubjectId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpenSubjectId(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass rounded-2xl border border-border w-full max-w-md p-6 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{selectedSubject?.name} &mdash; Chapter Choose Karo</h3>
                <button onClick={() => setOpenSubjectId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-2 overflow-y-auto flex-1">
                {chapters.map((c) => (
                  <button key={c.id} onClick={() => setChapterId(c.id)}
                    className={cn('w-full text-left p-3 rounded-lg border text-sm transition-colors',
                      chapterId === c.id ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-border hover:border-violet-500/40')}>
                    {c.name}
                  </button>
                ))}
                {chapters.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aapki class ke liye is subject mein abhi koi chapter available nahi hai.
                  </p>
                )}
              </div>

              <Button variant="gradient" size="lg" className="w-full mt-4" disabled={!chapterId || loading}
                onClick={() => chapterId && startQuiz(openSubjectId, chapterId)}>
                <Zap className="w-4 h-4" />{loading ? 'Shuru ho raha hai...' : 'Practice Shuru Karo'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
