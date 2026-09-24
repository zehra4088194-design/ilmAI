// Small, dependency-free IANA-timezone helpers (no luxon/date-fns-tz needed —
// Intl.DateTimeFormat already ships in Node). Used by the biometric attendance
// sync (src/app/api/cron/biometric-attendance-sync/route.ts) to correctly
// interpret a ZKTeco device's wall-clock punch time as being in the
// institution's own timezone, not the server process's timezone.

function timeZoneOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc: Record<string, string>, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

// `date`'s own local getters (getFullYear/getHours/...) must already hold the
// intended wall-clock reading (this is what node-zklib produces — it builds a
// Date from raw device components via `new Date(y,m,d,h,mi,s)`, so the local
// getters reliably recover those numbers regardless of the server's own
// timezone). This re-interprets that wall-clock reading as belonging to
// `timeZone` instead of the server's zone, returning the correct absolute instant.
export function reinterpretWallTimeInZone(date: Date, timeZone: string): Date {
  const utcGuess = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );
  // Two-pass: the offset itself can shift the calendar day near a DST
  // transition, so resolve it once against the initial guess and once more
  // against the corrected instant (Asia/Karachi has no DST, but this keeps
  // the helper correct for any IANA zone, not just the common case).
  const firstOffset = timeZoneOffsetMs(timeZone, new Date(utcGuess));
  const corrected = utcGuess - firstOffset;
  const secondOffset = timeZoneOffsetMs(timeZone, new Date(corrected));
  return new Date(utcGuess - secondOffset);
}

export function startOfTodayInZone(timeZone: string): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now)
    .reduce((acc: Record<string, string>, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
  return reinterpretWallTimeInZone(
    new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 0, 0, 0),
    timeZone
  );
}

// 'YYYY-MM-DD' for `date` as seen in `timeZone` — the institution's own
// calendar day, not the server's/UTC's.
export function dateKeyInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
