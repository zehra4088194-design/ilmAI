import { describe, expect, it } from 'vitest';
import { getSignupSteps } from './index';

describe('signup step order', () => {
  it('keeps school/college student signup to identity, account, and class only', () => {
    expect(getSignupSteps('school-college').map((step) => step.id)).toEqual([
      'identity',
      'account',
      'study',
    ]);
  });

  it('keeps university signup separate from school/college and limited to essential study setup', () => {
    expect(getSignupSteps('university').map((step) => step.id)).toEqual([
      'identity',
      'account',
      'study',
    ]);
  });

  it('keeps parent signup limited to identity and account creation', () => {
    expect(getSignupSteps('parent').map((step) => step.id)).toEqual([
      'identity',
      'account',
    ]);
  });

  it('routes institutional students through role, institution, and class without board/gender', () => {
    expect(getSignupSteps('institutional', 'student').map((step) => step.id)).toEqual([
      'identity',
      'role',
      'account',
      'school',
      'study',
    ]);
  });

  it('keeps institutional teacher signup focused on account and institution join', () => {
    expect(getSignupSteps('institutional', 'teacher').map((step) => step.id)).toEqual([
      'identity',
      'role',
      'account',
      'school',
    ]);
  });

  it('keeps the kid path compact and age-aware without regular student fields', () => {
    expect(getSignupSteps('kid').map((step) => step.id)).toEqual([
      'identity',
      'account',
    ]);
  });
});
