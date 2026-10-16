import { describe, expect, it } from 'vitest';
import {
  buildBookPath,
  matchBookTitle,
  parseLibraryResourceType,
  slugifyBookTitle,
} from './catalog';

describe('slugifyBookTitle', () => {
  it('produces stable URL-safe slugs', () => {
    expect(slugifyBookTitle('Class 9 Biology Textbook (Punjab)')).toBe('class-9-biology-textbook-punjab');
    expect(slugifyBookTitle('  Physics & Chemistry Notes  ')).toBe('physics-and-chemistry-notes');
  });

  it('is deterministic for the same title', () => {
    const a = slugifyBookTitle('Class 12 English Notes (Punjab)');
    const b = slugifyBookTitle('Class 12 English Notes (Punjab)');
    expect(a).toBe(b);
    expect(a).toBe('class-12-english-notes-punjab');
  });
});

describe('buildBookPath', () => {
  it('builds path without query for default text_book type', () => {
    expect(buildBookPath('biology', 'Class 9 Biology Textbook (Punjab)')).toBe(
      '/library/biology/books/class-9-biology-textbook-punjab'
    );
  });

  it('appends type query only for non-default resource types', () => {
    expect(buildBookPath('english', 'Class 12 English Notes (Punjab)', 'notes')).toBe(
      '/library/english/books/class-12-english-notes-punjab?type=notes'
    );
  });
});

describe('matchBookTitle', () => {
  const titles = ['Class 9 Biology Textbook (Punjab)', 'Class 10 Biology Notes', 'General Notes'];

  it('matches by slug', () => {
    expect(matchBookTitle(titles, 'class-9-biology-textbook-punjab')).toBe('Class 9 Biology Textbook (Punjab)');
  });

  it('matches by exact title (legacy query param)', () => {
    expect(matchBookTitle(titles, 'Class 10 Biology Notes')).toBe('Class 10 Biology Notes');
  });

  it('returns null for unknown books', () => {
    expect(matchBookTitle(titles, 'missing-book')).toBeNull();
  });
});

describe('parseLibraryResourceType', () => {
  it('defaults unknown values to text_book', () => {
    expect(parseLibraryResourceType(undefined)).toBe('text_book');
    expect(parseLibraryResourceType('other')).toBe('text_book');
    expect(parseLibraryResourceType('notes')).toBe('notes');
  });
});
