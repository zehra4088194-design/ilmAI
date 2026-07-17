import { describe, expect, it } from 'vitest';
import { analyzeResourceSource, buildResourceSourceSummary, buildResourceSourceTest } from './source-fallback';

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
      expect(mcq.opts).toHaveLength(4);
      expect(mcq.correct).toBeGreaterThanOrEqual(0);
      expect(mcq.correct).toBeLessThan(4);
    }
  });
});
