'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks browser connectivity via navigator.onLine + the online/offline
 * window events. Defaults to true during SSR/first paint so server-rendered
 * markup never mismatches the client before hydration reads the real state.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
