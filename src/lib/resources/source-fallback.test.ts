import { describe, expect, it } from 'vitest';
import {
  analyzeResourceSource,
  buildResourceSourceSummary,
  buildResourceSourceTest,
  filterSourceWrittenQuestions,
  isHighQualitySourceMcq,
  sanitizeSourceQuestionText,
} from './source-fallback';

const SOURCE = `
Class 9 Physics - Unit 2 Exercise
Unit 2: Force and Motion

MULTIPLE CHOICE QUESTIONS
1. What is the SI unit of force?
A. Newton
B. Joule
C. Watt
D. Pascal
Answer: A

2. Which quantity is the product of mass and velocity?
A. Force
B. Momentum
C. Power
D. Pressure
Answer: B

SHORT QUESTIONS
3. Define force?
Ans. Force is a push or pull that can change the state of motion of an object.
4. What is momentum?
Ans. Momentum is the product of mass and velocity.

LONG QUESTIONS
5. Explain Newton's laws of motion with examples?
Mass is the amount of matter in an object.
Acceleration is the rate of change of velocity.
Inertia refers to the tendency of an object to resist a change in motion.
`;

describe('resource source fallback', () => {
  it('detects topics and available question types', () => {
    const result = analyzeResourceSource(SOURCE);
    expect(result.topics.some((topic) => topic.toLowerCase().includes('force'))).toBe(true);
    expect(result.detectedSections).toContain('existing mcqs');
    expect(result.available.mcq).toBeGreaterThanOrEqual(2);
    expect(result.available.short).toBeGreaterThanOrEqual(2);
    expect(result.available.long).toBeGreaterThanOrEqual(1);
  });

  it('builds a structured source summary', () => {
    const summary = buildResourceSourceSummary('Force and Motion Notes', SOURCE);
    expect(summary).toContain('### Force and Motion Notes - Source Summary');
    expect(summary).toContain('**Key concepts and exam points**');
    expect(summary).toContain('**Revision checklist**');
  });

  it('returns the exact requested test counts with valid MCQs', () => {
    const paper = buildResourceSourceTest('Force and Motion Notes', SOURCE, { mcq: 4, short: 3, long: 2 });
    expect(paper.mcqs).toHaveLength(4);
    expect(paper.shortQs).toHaveLength(3);
    expect(paper.longQs).toHaveLength(2);
    for (const mcq of paper.mcqs) {
      expect(mcq.q).not.toMatch(/according to|uploaded|file|source|document/i);
      expect(mcq.opts).toHaveLength(4);
      expect(mcq.correct).toBeGreaterThanOrEqual(0);
      expect(mcq.correct).toBeLessThan(4);
    }
  });

  it('rejects meta questions that test awareness of a file instead of subject knowledge', () => {
    expect(
      isHighQualitySourceMcq({
        q: 'According to the uploaded file, which option is correct?',
        opts: ['Force', 'Motion', 'Energy', 'Power'],
        correct: 0,
        exp: 'Force is correct.',
      })
    ).toBe(false);
    expect(
      isHighQualitySourceMcq({
        q: 'What is this?',
        opts: ['Force', 'Motion', 'Energy', 'Power'],
        correct: 0,
        exp: 'Force is correct.',
      })
    ).toBe(false);
  });

  it('reads a separate MCQ answer key and builds questions from every TXT section', () => {
    const source = `
MULTIPLE CHOICE QUESTIONS
1. Which planet is known as the Red Planet?
A. Venus
B. Mars
C. Jupiter
D. Mercury
2. Which gas is essential for respiration?
A. Nitrogen
B. Hydrogen
C. Oxygen
D. Helium

SHORT QUESTIONS
3. Define respiration.
Ans. Respiration is the process that releases energy from food.
4. State two functions of the respiratory system.

LONG QUESTIONS
5. Explain the human respiratory system in detail.

ANSWER KEY
1-B, 2-C
`;
    const paper = buildResourceSourceTest('Biology Bank', source, { mcq: 2, short: 2, long: 1 });
    expect(paper.mcqs).toHaveLength(2);
    expect(paper.mcqs.find((question) => question.q.includes('Red Planet'))?.correct).toBe(1);
    expect(paper.mcqs.find((question) => question.q.includes('respiration'))?.correct).toBe(2);
    expect(paper.shortQs.some((question) => question.q === 'Define respiration.')).toBe(true);
    expect(paper.longQs.some((question) => question.q.includes('human respiratory system'))).toBe(true);
  });

  it('cleans or rejects file-aware wording in MCQ, short, and long questions', () => {
    expect(sanitizeSourceQuestionText('According to the uploaded file, what is momentum?')).toBe('What is momentum?');
    expect(sanitizeSourceQuestionText('What does the provided document say about inertia?')).toBe('Explain inertia.');
    const cleaned = filterSourceWrittenQuestions(
      [
        { q: 'Based on the source: define force.', marks: 3, keyPoints: [] },
        { q: 'Which option is supported by the text?', marks: 3, keyPoints: [] },
      ],
      'short'
    );
    expect(cleaned.map((question) => question.q)).toEqual(['Define force.']);
  });
});
