'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils/format';
import type { ContinueLearningItem } from '@/lib/resources/continue-learning';

export function ContinueLearning({ items }: { items: ContinueLearningItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Continue Learning</CardTitle>
        <Button asChild variant="ghost" size="sm"><Link href="/study">View All <ArrowRight className="w-3 h-3" /></Link></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Start a chapter to see it here.</p>
            <Button asChild variant="outline" size="sm"><Link href="/study">Browse subjects</Link></Button>
          </div>
        )}
        {items.map((item, i) => (
          <motion.div key={`${item.subjectSlug}-${item.chapterSlug}`} whileHover={{ x: 4 }} transition={{ delay: i * 0.03 }}>
            <Link
              href={`/study/${item.subjectSlug}/${item.chapterSlug}`}
              className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${item.subjectColor || '#7c3aed'}20`, color: item.subjectColor || '#7c3aed' }}
              >
                <PlayCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.subjectName}</p>
                <p className="text-xs text-muted-foreground truncate">{item.chapterName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Read {formatRelativeTime(item.lastReadAt)}</p>
              </div>
              {item.nextChapter && (
                <span className="shrink-0 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-300">
                  Next: {item.nextChapter.name}
                </span>
              )}
            </Link>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
