// Used by the Switch Profile / Linked Accounts feature — only the masked form is ever persisted
// on `linked_accounts` (the raw target email is looked up fresh at switch time instead), so this
// is purely a display helper.
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
}
