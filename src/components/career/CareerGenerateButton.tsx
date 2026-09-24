'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function CareerGenerateButton({ hasInput, hasRecommendations }: { hasInput: boolean; hasRecommendations: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generate(refresh: boolean) {
    if (!hasInput) {
      toast.error('Save your career profile first');
      router.push('/career/setup');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/career/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      const json = await res.json();
      if (json.status !== 'success') {
        toast.error(json.error || 'Career recommendations unavailable');
        return;
      }
      if (json.data?.locked) {
        toast.info('Full career counselor is available on Pro and Elite');
      } else {
        toast.success(refresh ? 'Career plan refreshed' : 'Career plan generated');
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="gradient" disabled={loading} onClick={() => generate(hasRecommendations)}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : hasRecommendations ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      {hasRecommendations ? 'Refresh' : 'Generate'}
    </Button>
  );
}
