import { describe, expect, it } from 'vitest';
import { parseOcrTableMcqs, parseStructuredMcqs } from '../../../scripts/seed-diagnostic-from-drive';

describe('Drive diagnostic MCQ parser', () => {
  it('parses inline answers with parenthesized options', () => {
    const result = parseStructuredMcqs(`
1. Two plus two is:
  (A) 3
  (B) 4
  (C) 5
  (D) 6
  Answer: B - Basic addition.
`);
    expect(result).toMatchObject([{ text: 'Two plus two is:', options: ['3', '4', '5', '6'], correct: 1 }]);
  });

  it('parses a separate numbered answer key', () => {
    const result = parseStructuredMcqs(`
1. Pick one:
  A. Zero
  B. One
  C. Two
  D. Three

ANSWER KEY
1. C
`);
    expect(result[0]?.correct).toBe(2);
  });

  it('parses a compact answer key', () => {
    const result = parseStructuredMcqs(`
1. First:
  a) A1
  b) B1
  c) C1
  d) D1
2. Second:
  a) A2
  b) B2
  c) C2
  d) D2

Answer Key:
1-a, 2-b
`);
    expect(result.map((question) => question.correct)).toEqual([0, 1]);
  });

  it('parses a matrix answer key', () => {
    const result = parseStructuredMcqs(`
1. First:
  A. A1
  B. B1
  C. C1
  D. D1
2. Second:
  A. A2
  B. B2
  C. C2
  D. D2

ANSWER KEY
1  2
C  D
`);
    expect(result.map((question) => question.correct)).toEqual([2, 3]);
  });

  it('detects an answer marker attached to an option', () => {
    const result = parseStructuredMcqs(`
1. Select the answer:
  A) No
  B) Yes  <-- Answer
  C) Maybe
  D) Unknown
`);
    expect(result[0]).toMatchObject({ options: ['No', 'Yes', 'Maybe', 'Unknown'], correct: 1 });
  });

  it('detects an asterisk marking the correct option', () => {
    const result = parseStructuredMcqs(`
1. Select the answer:
  A. No
  B.* Yes
  C. Maybe
  D. Unknown
`);
    expect(result[0]).toMatchObject({ options: ['No', 'Yes', 'Maybe', 'Unknown'], correct: 1 });
  });

  it('recovers complete OCR option groups and marks answer-key choices', () => {
    const result = parseOcrTableMcqs(`
Class 9 Chemistry - Unit 1 Exercise
Al students.
/1] First OCR question?
A. First A
B. First B
Cc. First C
D. First D

B Second OCR question?
A. Second A
B. Second B
C. Second C
D. Second D

ANSWER KEY
1 2

ILM AI STUDY - Page 4 of 5
--- Page 4 khatam ho gayi ---
A ic
`);
    expect(result.map((question) => question.correct)).toEqual([0, 2]);
    expect(result[0]?.text).toBe('First OCR question?');
    expect(result[1]?.text).toContain('Second OCR question');
  });

  it('keeps source numbering when earlier OCR answers are missing', () => {
    const result = parseOcrTableMcqs(`
1] First OCR question?
A. First A
B. First B
C. First C
D. First D

2] Second OCR question?
A. Second A
B. Second B
C. Second C
D. Second D

ANSWER KEY
1 2
& C
`);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ text: 'Second OCR question?', correct: 2 });
  });
});
