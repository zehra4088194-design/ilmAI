import { describe, expect, it } from 'vitest';
import { buildRepresentativeTextContext } from '@/lib/resources/context-window';

describe('buildRepresentativeTextContext', () => {
  it('returns short companion text unchanged', () => {
    const text = 'Chapter 1\n\nForce equals mass times acceleration.';
    expect(buildRepresentativeTextContext(text)).toBe(text);
  });

  it('bounds long text while retaining material from its beginning and end', () => {
    const text = `BEGINNING ${'a'.repeat(15_000)} ENDING`;
    const result = buildRepresentativeTextContext(text, 4_000);
    expect(result.length).toBeLessThanOrEqual(4_000);
    expect(result).toContain('BEGINNING');
    expect(result).toContain('ENDING');
    expect(result).toContain('[TXT section 1');
  });

  it('removes null bytes and normalizes Windows line endings', () => {
    expect(buildRepresentativeTextContext('\uFEFFFirst\r\nSecond\0')).toBe('First\nSecond');
  });
});
