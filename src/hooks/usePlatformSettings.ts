'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_PLATFORM_SETTINGS,
  normalizePlatformSettings,
  type PlatformSettings,
} from '@/lib/platform-settings/shared';

export function usePlatformSettings(initialSettings: PlatformSettings = DEFAULT_PLATFORM_SETTINGS) {
  const [settings, setSettings] = useState(() => normalizePlatformSettings(initialSettings));

  useEffect(() => {
    let active = true;
    fetch('/api/platform-settings')
      .then((res) => res.json())
      .then((json) => {
        if (active) setSettings(normalizePlatformSettings(json.settings));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return settings;
}
