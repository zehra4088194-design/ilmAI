import { describe, expect, it } from 'vitest';
import { getSignupSteps } from './index';

describe('signup step order', () => {
  it('asks school and college students one focused step at a time in the required order', () => {
    expect(getSignupSteps('school-college').map((step) => step.id)).toEqual([
      'identity',
      'birthdate',
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

  it('skips grade and board for university students', () => {
    expect(getSignupSteps('university').map((step) => step.id)).toEqual([
      'identity',
      'birthdate',
      'language',
      'name',
      'email',
      'password',
      'username',
      'gender',
      'institution',
    ]);
  });

  it('keeps parent signup limited to identity and login credentials', () => {
    expect(getSignupSteps('parent').map((step) => step.id)).toEqual([
      'identity',
      'language',
      'name',
      'email',
      'password',
      'username',
    ]);
  });

  it('routes institutional students through role, a school search, and class/board', () => {
    expect(getSignupSteps('institutional', 'student').map((step) => step.id)).toEqual([
      'identity',
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
    expect(getSignupSteps('institutional', 'teacher').map((step) => step.id)).toEqual([
      'identity',
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
