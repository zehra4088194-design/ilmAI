'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { BOARDS } from '@/lib/constants';

export function PastPapersGrid({ subjects, board }: { subjects: { id: string; name: string; slug: string; color: string }[]; board?: string }) {
  const boardLabel = BOARDS.find((item) => item.value === board)?.label || 'Your board';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1.5 rounded-full text-sm border bg-primary text-primary-foreground border-primary">{boardLabel}</span>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map(subject => (
          <Card key={subject.id} className="hover:border-violet-500/30 transition-colors">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${subject.color}20` }}>
                <FileText className="w-5 h-5" style={{ color: subject.color }} />
              </div>
              <h3 className="font-semibold mb-3">{subject.name}</h3>
              <div className="space-y-2">
                {[2025, 2024, 2023].map(year => (
                  <div key={year} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                    <span>{year} Annual Paper</span>
                    <Button variant="ghost" size="icon-sm"><Download className="w-3.5 h-3.5" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
