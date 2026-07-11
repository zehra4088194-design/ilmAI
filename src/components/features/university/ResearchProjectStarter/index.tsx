'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export function ResearchProjectStarter() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!title.trim()) {
      toast.error('Research project ka title likho.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/research/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, topic }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      router.push(`/university/research/${json.data.id}`);
    } catch {
      toast.error('Workspace create nahi ho saka.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Research title</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 w-full rounded-lg border bg-background px-3 text-sm" placeholder="AI in education research" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Topic / scope</label>
          <input value={topic} onChange={(event) => setTopic(event.target.value)} className="h-11 w-full rounded-lg border bg-background px-3 text-sm" placeholder="Personalized learning for Pakistani students" />
        </div>
        <Button variant="gradient" onClick={create} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
          Create workspace
        </Button>
      </CardContent>
    </Card>
  );
}
