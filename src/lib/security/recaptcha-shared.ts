export const RECAPTCHA_ACTIONS = [
  'auth_login',
  'auth_magic_link',
  'auth_signup',
  'auth_password_reset',
  'auth_resend_verification',
  'contact_submit',
  'demo_start',
  'school_admission',
] as const;

export type RecaptchaAction = (typeof RECAPTCHA_ACTIONS)[number];

const RECAPTCHA_ACTION_SET = new Set<string>(RECAPTCHA_ACTIONS);

export function isRecaptchaAction(value: unknown): value is RecaptchaAction {
  return typeof value === 'string' && RECAPTCHA_ACTION_SET.has(value);
}

export const AUTH_RECAPTCHA_ACTIONS: readonly RecaptchaAction[] = [
  'auth_login',
  'auth_magic_link',
  'auth_signup',
  'auth_password_reset',
  'auth_resend_verification',
];
