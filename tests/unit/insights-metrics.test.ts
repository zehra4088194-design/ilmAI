import { describe, expect, it } from 'vitest';
import { buildStudyPulse, quizPercentage } from '@/lib/insights/metrics';

describe('insight metrics', () => {
  it('uses answer counts when a saved percentage is unavailable', () => {
    expect(quizPercentage({ score: null, correct_count: 7, incorrect_count: 2, skipped_count: 1 })).toBe(70);
  });

  it('builds a seven-day pulse and compares the latest five quizzes', () => {
    const now = new Date('2026-07-29T12:00:00.000Z');
    const quizzes = [
      ...[80, 80, 80, 80, 80].map((score) => ({
        score,
        completed_at: '2026-07-28T10:00:00.000Z',
      })),
      ...[60, 60, 60, 60, 60].map((score) => ({
        score,
        completed_at: '2026-07-10T10:00:00.000Z',
      })),
    ];

    expect(
      buildStudyPulse(
        quizzes,
        [
          { duration: 1800, created_at: '2026-07-27T10:00:00.000Z' },
          { duration: 900, date: '2026-07-25' },
          { duration: 7200, created_at: '2026-07-01T10:00:00.000Z' },
        ],
        3,
        now
      )
    ).toEqual({
      recentQuizAverage: 80,
      scoreTrend: 20,
      quizzesThisWeek: 5,
      studyMinutesThisWeek: 45,
      dueRevisions: 3,
    });
  });
});
