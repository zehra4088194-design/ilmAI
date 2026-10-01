const PHONE_ALLOWED = /^[+()0-9\s-]+$/;

export function normalizePhone(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidPhone(value: string): boolean {
  const phone = normalizePhone(value);
  const digits = phone.replace(/\D/g, '');
  return phone.length >= 7 && phone.length <= 24 && digits.length >= 7 && digits.length <= 15 && PHONE_ALLOWED.test(phone);
}
