'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, BookOpen } from 'lucide-react';
import type { Subject } from '@/types';
import { toast } from 'sonner';

export function SubjectSelector({ subjects }: { subjects: any[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const startQuiz = async (subjectId: string, chapterId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, chapterIds: [chapterId], count: 10, difficulty: 'MEDIUM' }),
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

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {subjects.map((subject, i) => (
        <motion.div key={subject.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="hover:border-violet-500/30 transition-colors cursor-pointer h-full" onClick={() => setSelected(subject.id)}>
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${subject.color}20` }}>
                <BookOpen className="w-5 h-5" style={{ color: subject.color }} />
              </div>
              <h3 className="font-semibold mb-1">{subject.name}</h3>
              <p className="text-xs text-muted-foreground mb-4">{subject.total_chapters} chapters · {subject.total_questions} questions</p>
              <Button variant="gradient" size="sm" className="w-full" loading={loading && selected === subject.id}
                onClick={(e) => { e.stopPropagation(); startQuiz(subject.id, subject.id); }}>
                <Zap className="w-3.5 h-3.5" />Start Practice
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
      {subjects.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground">Koi subjects available nahi hain abhi. Jald hi add honge!</div>
      )}
    </div>
  );
}
