import { describe, expect, it } from 'vitest';
import { getSignupSteps } from './index';

describe('signup step order', () => {
  it('asks school students one focused step at a time in the required order', () => {
    expect(getSignupSteps('student', 'school').map((step) => step.id)).toEqual([
      'name',
      'email',
      'password',
      'username',
      'gender',
      'education',
      'institution',
      'grade',
      'board',
    ]);
  });

  it('skips grade and board for university students', () => {
    expect(getSignupSteps('student', 'university').map((step) => step.id)).toEqual([
      'name',
      'email',
      'password',
      'username',
      'gender',
      'education',
      'institution',
    ]);
  });

  it('keeps parent signup limited to identity and login credentials', () => {
    expect(getSignupSteps('parent', 'school').map((step) => step.id)).toEqual([
      'name',
      'email',
      'password',
      'username',
    ]);
  });
});
