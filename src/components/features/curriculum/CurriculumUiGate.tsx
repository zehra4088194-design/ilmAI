'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CURRICULUM_UI_STORAGE_KEY } from './CurriculumFeatureToggle';

export function CurriculumUiGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = window.localStorage.getItem(CURRICULUM_UI_STORAGE_KEY) === 'true';
      setEnabled(next);
      setReady(true);
      if (!next) router.replace('/study');
    };

    sync();
    const onChange = (event: Event) => {
      const custom = event as CustomEvent<boolean>;
      const next = typeof custom.detail === 'boolean'
        ? custom.detail
        : window.localStorage.getItem(CURRICULUM_UI_STORAGE_KEY) === 'true';
      setEnabled(next);
      if (!next) router.replace('/study');
    };

    window.addEventListener('ilmai-curriculum-ui-change', onChange);
    return () => window.removeEventListener('ilmai-curriculum-ui-change', onChange);
  }, [router]);

  if (!ready || !enabled) return null;
  return <>{children}</>;
}
