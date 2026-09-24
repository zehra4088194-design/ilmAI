import { NextRequest, NextResponse } from 'next/server';
import { AUTH_RECAPTCHA_ACTIONS, isRecaptchaAction } from '@/lib/security/recaptcha-shared';
import { logRecaptchaFailure, verifyRecaptchaToken } from '@/lib/security/recaptcha-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (!isRecaptchaAction(action) || !AUTH_RECAPTCHA_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid security action.' }, { status: 400 });
  }

  const result = await verifyRecaptchaToken(typeof body?.token === 'string' ? body.token : null, action);
  if (!result.success) {
    logRecaptchaFailure(action, result);
    return NextResponse.json({ error: 'Security verification failed. Please try again.' }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
