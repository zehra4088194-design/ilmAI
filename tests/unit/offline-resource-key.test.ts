import { afterEach, describe, expect, it } from 'vitest';
import { offlineResourceKey } from '@/lib/offline/resources';
import { useAuthStore } from '@/store/auth.store';

function setUser(id: string | null) {
  useAuthStore.setState({ user: id ? ({ id } as any) : null });
}

describe('offlineResourceKey', () => {
  afterEach(() => setUser(null));

  it('scopes the key to the currently signed-in user', () => {
    setUser('user-a');
    expect(offlineResourceKey('library', 'res-1', 'dark')).toBe('user-a:library:res-1:dark');
  });

  it('produces different keys for the same resource across different users', () => {
    setUser('user-a');
    const keyA = offlineResourceKey('past-paper', 'paper-1', 'light');
    setUser('user-b');
    const keyB = offlineResourceKey('past-paper', 'paper-1', 'light');
    expect(keyA).not.toBe(keyB);
  });

  it('falls back to a fixed anonymous bucket when no user is loaded', () => {
    setUser(null);
    expect(offlineResourceKey('college-resource', 'res-2', 'dark')).toBe('anonymous:college-resource:res-2:dark');
  });
});
