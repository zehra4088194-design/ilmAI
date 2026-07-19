import { describe, expect, it } from 'vitest';
import { matchesRoutePrefix } from './route-prefix';

describe('route prefix matching', () => {
  it('matches a route and its nested segments', () => {
    expect(matchesRoutePrefix('/parent', '/parent')).toBe(true);
    expect(matchesRoutePrefix('/parent/analytics', '/parent')).toBe(true);
  });

  it('does not match a different route with the same initial characters', () => {
    expect(matchesRoutePrefix('/parent-link', '/parent')).toBe(false);
    expect(matchesRoutePrefix('/teacher-tools', '/teacher')).toBe(false);
  });
});
