import { describe, expect, it } from 'vitest';
import { getSignupSteps } from './index';

describe('signup step order', () => {
  it('asks individual school students one focused step at a time in the required order', () => {
    expect(getSignupSteps('individual', 'student', 'student', 'school').map((step) => step.id)).toEqual([
      'mode',
      'account',
      'language',
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

  it('skips grade and board for individual university students', () => {
    expect(getSignupSteps('individual', 'student', 'student', 'university').map((step) => step.id)).toEqual([
      'mode',
      'account',
      'language',
      'name',
      'email',
      'password',
      'username',
      'gender',
      'education',
      'institution',
    ]);
  });

  it('keeps individual parent signup limited to identity and login credentials', () => {
    expect(getSignupSteps('individual', 'parent', 'student', 'school').map((step) => step.id)).toEqual([
      'mode',
      'account',
      'language',
      'name',
      'email',
      'password',
      'username',
    ]);
  });

  it('routes institutional students through role, a school search, and class/board', () => {
    expect(getSignupSteps('institutional', 'student', 'student', 'school').map((step) => step.id)).toEqual([
      'mode',
      'role',
      'language',
      'name',
      'email',
      'password',
      'username',
      'gender',
      'school',
      'grade',
      'board',
    ]);
  });

  it('skips gender, grade, and board for institutional teachers', () => {
    expect(getSignupSteps('institutional', 'student', 'teacher', 'school').map((step) => step.id)).toEqual([
      'mode',
      'role',
      'language',
      'name',
      'email',
      'password',
      'username',
      'school',
    ]);
  });
});
