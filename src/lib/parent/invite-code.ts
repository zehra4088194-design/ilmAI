const PARENT_INVITE_CODE = /^SV-[A-Z0-9]{4,12}$/;

function normalizeCode(value: string) {
  const code = value.trim().toUpperCase();
  return PARENT_INVITE_CODE.test(code) ? code : null;
}

export function normalizeParentInvitePayload(value: unknown) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const directCode = normalizeCode(trimmed);
  if (directCode) return directCode;

  try {
    const parsed = new URL(trimmed, 'https://invite.invalid');
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/parent-link') return null;
    return normalizeCode(parsed.searchParams.get('code') || '');
  } catch {
    return null;
  }
}

export function buildParentConnectPath(inviteCode: string) {
  const code = normalizeParentInvitePayload(inviteCode);
  if (!code) throw new Error('Invalid parent invite code');
  return `/parent-link?code=${encodeURIComponent(code)}`;
}
