'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const CURRICULUM_UI_STORAGE_KEY = 'ilmai-curriculum-ui-enabled';

function readEnabled() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(CURRICULUM_UI_STORAGE_KEY) === 'true';
}

export function CurriculumFeatureToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(readEnabled());
  }, []);

  const handleChange = (next: boolean) => {
    setEnabled(next);
    window.localStorage.setItem(CURRICULUM_UI_STORAGE_KEY, String(next));
    window.dispatchEvent(new CustomEvent('ilmai-curriculum-ui-change', { detail: next }));
  };

  return (
    <Card className="border-violet-500/20 bg-violet-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">Curriculum</CardTitle>
              <CardDescription className="mt-1">
                Temporarily show or hide the textbook curriculum feature while its content is being completed.
              </CardDescription>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Enable curriculum feature"
            onClick={() => handleChange(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
              enabled ? 'border-violet-500 bg-violet-600' : 'border-border bg-muted'
            }`}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {enabled ? 'Curriculum UI is enabled.' : 'Curriculum UI is currently hidden.'}
        </div>
      </CardContent>
    </Card>
  );
}
