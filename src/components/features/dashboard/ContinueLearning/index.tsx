'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlayCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

const MOCK_SUBJECTS = [
  { name: 'Physics', chapter: 'Chapter 5: Work, Energy & Power', progress: 65, color: 'from-blue-500 to-indigo-600' },
  { name: 'Chemistry', chapter: 'Chapter 3: Chemical Bonding', progress: 40, color: 'from-green-500 to-emerald-600' },
  { name: 'Mathematics', chapter: 'Chapter 8: Trigonometry', progress: 80, color: 'from-violet-500 to-purple-600' },
];

export function ContinueLearning() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Continue Learning</CardTitle>
        <Button asChild variant="ghost" size="sm"><Link href="/study">View All <ArrowRight className="w-3 h-3" /></Link></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {MOCK_SUBJECTS.map((subject, i) => (
          <motion.div key={i} whileHover={{ x: 4 }} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${subject.color} flex items-center justify-center shrink-0`}>
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{subject.name}</p>
              <p className="text-xs text-muted-foreground truncate">{subject.chapter}</p>
              <Progress value={subject.progress} className="h-1.5 mt-2" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{subject.progress}%</span>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
