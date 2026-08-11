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

  it('boosts backgrounds whose category matches the requested subject/topic', () => {
    const categorized: PresentationBackground[] = [
      { name: 'lab.jpg', url: '/lab', size: 1, subject: '', keywords: [], category: 'science', isGlobal: false },
      { name: 'chart.jpg', url: '/chart', size: 1, subject: '', keywords: [], category: 'business', isGlobal: false },
    ];
    const result = selectPresentationBackgrounds(categorized, 'Lab safety in science class', 'Science');
    expect(result[0]?.name).toBe('lab.jpg');
  });

  it('falls back to a neutral background instead of an empty array when nothing matches and no global exists', () => {
    const noGlobal: PresentationBackground[] = [
      { name: 'abstract.jpg', url: '/abstract', size: 1, subject: '', keywords: [], category: 'abstract', isGlobal: false },
      { name: 'code.jpg', url: '/code', size: 1, subject: 'Computer Science', keywords: ['programming'], category: 'technology', isGlobal: false },
    ];
    const result = selectPresentationBackgrounds(noGlobal, 'Ancient Egyptian history', 'History');
    expect(result.map((item) => item.name)).toEqual(['abstract.jpg']);
  });
});
