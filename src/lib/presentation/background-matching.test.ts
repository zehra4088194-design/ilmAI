import { describe, expect, it } from 'vitest';
import { selectPresentationBackgrounds } from './background-matching';
import type { PresentationBackground } from './types';

const backgrounds: PresentationBackground[] = [
  { name: 'cells.jpg', url: '/cells', size: 1, subject: 'Biology', keywords: ['cells', 'microscope'], isGlobal: false },
  { name: 'plants.jpg', url: '/plants', size: 1, subject: 'Biology', keywords: ['photosynthesis', 'chlorophyll'], isGlobal: false },
  { name: 'code.jpg', url: '/code', size: 1, subject: 'Computer Science', keywords: ['programming'], isGlobal: false },
  { name: 'general.jpg', url: '/general', size: 1, subject: '', keywords: [], isGlobal: true },
];

describe('presentation background matching', () => {
  it('uses only subject/topic-related images', () => {
    const result = selectPresentationBackgrounds(backgrounds, 'How photosynthesis works', 'Biology');
    expect(result.map((item) => item.name)).toEqual(['plants.jpg', 'cells.jpg']);
  });

  it('uses explicit general images when nothing matches', () => {
    const result = selectPresentationBackgrounds(backgrounds, 'French Revolution', 'History');
    expect(result.map((item) => item.name)).toEqual(['general.jpg']);
  });
});
