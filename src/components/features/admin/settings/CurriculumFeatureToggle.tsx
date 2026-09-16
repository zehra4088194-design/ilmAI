'use client';

import { useState } from 'react';
import { BookOpenCheck, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

export function CurriculumFeatureToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/curriculum-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Setting could not be saved.');
      setEnabled(json.enabled === true);
      toast.success(json.enabled ? 'Curriculum / Smart Book Practice enabled.' : 'Curriculum / Smart Book Practice disabled.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Setting could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-violet-500/25 bg-violet-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-violet-400" />
          Master feature switch
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="font-medium">Curriculum / Smart Book Practice</p>
          <p className="mt-1 text-sm text-muted-foreground">
            OFF means the curriculum pages and their API endpoints stay unavailable to users. It is OFF by default.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((current) => !current)}
          className={cn(
            'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
            enabled
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-border bg-background'
          )}
        >
          <span>
            <span className="block text-sm font-semibold">{enabled ? 'Enabled' : 'Disabled'}</span>
            <span className="block text-xs text-muted-foreground">
              {enabled ? 'Users can access curriculum and Smart Book Practice.' : 'Users will not see or use this feature.'}
            </span>
          </span>
          <span
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              enabled ? 'bg-emerald-500' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform',
                enabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </span>
        </button>

        <div className="flex justify-end">
          <Button variant="gradient" onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
