import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkDailyLimit } from '@/lib/rate-limit';
import { getActiveSchoolOrganizationId, getSchoolContext, hasSchoolModule, hasSchoolPermission } from '@/lib/school-erp/access';
import { completeQuizSession } from '@/lib/quiz/complete';
import { sendImmediateAttendanceAlerts } from '@/lib/school-erp/notification-queue';

/**
 * Server-side replay target for the offline queue (src/lib/offline/sync-queue.ts). Handles the
 * write types the client is allowed to queue while offline:
 *
 *  - 'attendance': one section's attendance for one date, same shape saveAttendance()
 *    (src/lib/school-erp/actions.ts) accepts, upserted the same way (onConflict
 *    section_id,student_id,attendance_date) so replaying twice is naturally idempotent. If a
 *    record already on the server disagrees with what's being replayed (different status, and it
 *    wasn't the same actor who wrote it), the mismatch is logged to offline_sync_conflicts instead
 *    of being silently overwritten, then the replay still applies last-write-wins as specced.
 *  - 'quiz_complete': the exact payload /api/quiz/complete accepts, replayed as-is. A client
 *    idempotency key prevents a duplicate XP/coin award if the same queued item is replayed twice
 *    (e.g. the client retried before seeing the first success response).
 *  - 'notes_create' / 'notes_update': a note written or edited while offline. The client generates
 *    the note's id itself (crypto.randomUUID(), a valid uuid the notes.id column accepts) so the
 *    same id can be used for the optimistic local copy and the eventual server row — replaying a
 *    'notes_create' twice for the same id is a plain upsert, so it's naturally idempotent too.
 *    Ownership is always re-derived from the session (user_id is never taken from the payload), so
 *    a queued item can never write into another user's notes.
 *
 * This route is intentionally NOT reachable through the service worker's cache — it's called
 * directly by app JS only when the browser reports it is back online.
 */

export const runtime = 'nodejs';

type AttendanceEntry = { studentId: string; status: string; remarks?: string };
type AttendancePayload = {
  sectionId: string;
  attendanceDate: string;
  entries: AttendanceEntry[];
};

async function syncAttendance(payload: AttendancePayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const organizationId = await getActiveSchoolOrganizationId();
  const context =
    (organizationId ? await getSchoolContext(supabase, user.id, organizationId) : null) ||
    (await getSchoolContext(supabase, user.id));
  if (!context || !hasSchoolPermission(context, 'attendance.manage') || !hasSchoolModule(context, 'attendance')) {
    return NextResponse.json({ error: 'You do not have permission for this action.' }, { status: 403 });
  }
  const limit = await checkDailyLimit(user.id, 'erp_mutation:attendance', 500);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many school updates today. Try again later.' }, { status: 429 });
  }

  const { sectionId, attendanceDate, entries } = payload;
  if (!sectionId || !attendanceDate || !Array.isArray(entries) || !entries.length) {
    return NextResponse.json({ error: 'Section, date, and at least one attendance entry are required.' }, { status: 400 });
  }
  const allowed = new Set(['present', 'absent', 'late', 'excused', 'leave']);
  const validEntries = entries.filter((entry) => entry.studentId && allowed.has(entry.status));
  if (!validEntries.length) return NextResponse.json({ error: 'No valid attendance entries were provided.' }, { status: 400 });

  const db = supabase as any;
  let hadConflict = false;

  const { data: existingRows } = await db
    .from('school_attendance_records')
    .select('student_id, status, marked_by, marked_at')
    .eq('section_id', sectionId)
    .eq('attendance_date', attendanceDate)
    .in(
      'student_id',
      validEntries.map((entry) => entry.studentId)
    );
  const existingByStudent = new Map((existingRows || []).map((row: any) => [row.student_id, row]));

  for (const entry of validEntries) {
    const existing = existingByStudent.get(entry.studentId) as { status: string; marked_by: string } | undefined;
    if (existing && existing.status !== entry.status && existing.marked_by !== user.id) {
      hadConflict = true;
      await db.from('offline_sync_conflicts').insert({
        entity_type: 'attendance',
        organization_id: context.organization.id,
        entity_ref: { sectionId, attendanceDate, studentId: entry.studentId },
        client_payload: entry,
        server_payload: existing,
        actor_id: user.id,
      });
    }
  }

  const records = validEntries.map((entry) => ({
    organization_id: context.organization.id,
    section_id: sectionId,
    student_id: entry.studentId,
    attendance_date: attendanceDate,
    status: entry.status,
    remarks: entry.remarks?.slice(0, 300) || null,
    marked_by: user.id,
    marked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db.from('school_attendance_records').upsert(records, {
    onConflict: 'section_id,student_id,attendance_date',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from('school_audit_logs').insert({
    organization_id: context.organization.id,
    actor_user_id: user.id,
    action: 'bulk_upsert_offline_sync',
    entity_type: 'attendance',
    entity_id: sectionId,
    metadata: { attendanceDate, count: records.length, conflict: hadConflict },
  });

  // Same Phase 2a real-time alert as the online saveAttendance() path — "immediate" here means
  // the moment the server actually learns about it, which for a queued-while-offline mark is now,
  // not whenever the teacher happened to be offline.
  const absentStudentIds = records.filter((record) => record.status === 'absent').map((record) => record.student_id);
  if (absentStudentIds.length) {
    try {
      await sendImmediateAttendanceAlerts(context.organization.id, attendanceDate, absentStudentIds);
    } catch (alertError) {
      console.error('Immediate attendance alert failed (offline sync):', alertError);
    }
  }

  return NextResponse.json({ status: 'success', conflict: hadConflict });
}

async function syncQuizComplete(payload: unknown, clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  // Delegates to the exact same ledger logic the live (online) quiz-completion route uses — see
  // src/lib/quiz/complete.ts — so a queued-while-offline completion is scored and awards XP/coins
  // identically to a normal one, just delivered later. The client-generated idempotency key (the
  // queue item's own id) makes replaying the same item twice a no-op instead of a double award.
  const result = await completeQuizSession(supabase, user.id, payload, clientId || null);
  return NextResponse.json(result.body, { status: result.status });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type NoteWritePayload = {
  id: string;
  title?: string;
  content?: string;
  is_starred?: boolean;
  folder?: string | null;
};

async function syncNotesCreate(payload: NoteWritePayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id, title, content, is_starred, folder } = payload || ({} as NoteWritePayload);
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'A valid note id is required.' }, { status: 400 });

  const limit = await checkDailyLimit(user.id, 'erp_mutation:offline_notes', 500);
  if (!limit.success) return NextResponse.json({ error: 'Too many offline updates today. Try again later.' }, { status: 429 });

  const db = supabase as any;
  // Upsert (not insert) so replaying the same queued item twice — e.g. the client retried before
  // seeing the first success — is a no-op instead of a duplicate/conflict error. user_id always
  // comes from the session, never the payload, so this can never create a note under another user.
  const { error } = await db.from('notes').upsert(
    {
      id,
      user_id: user.id,
      title: (title || 'New Note').slice(0, 200),
      content: content || '',
      is_starred: Boolean(is_starred),
      is_public: false,
      folder: folder?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}

async function syncNotesUpdate(payload: NoteWritePayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id, title, content, is_starred, folder } = payload || ({} as NoteWritePayload);
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'A valid note id is required.' }, { status: 400 });

  const db = supabase as any;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) update.title = title.slice(0, 200);
  if (content !== undefined) update.content = content;
  if (is_starred !== undefined) update.is_starred = Boolean(is_starred);
  if (folder !== undefined) update.folder = folder?.trim() || null;

  // Scoped to the caller's own row (eq user_id) rather than relying on RLS alone, so this can
  // never silently edit another user's note even if the client sent a note id it doesn't own —
  // it will just match zero rows.
  const { error, count } = await db
    .from('notes')
    .update(update, { count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
  return NextResponse.json({ status: 'success' });
}

export async function POST(req: NextRequest) {
  let body: { id?: string; type?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (body.type === 'attendance') {
    return syncAttendance(body.payload as AttendancePayload);
  }
  if (body.type === 'quiz_complete') {
    return syncQuizComplete(body.payload, body.id || '');
  }
  if (body.type === 'notes_create') {
    return syncNotesCreate(body.payload as NoteWritePayload);
  }
  if (body.type === 'notes_update') {
    return syncNotesUpdate(body.payload as NoteWritePayload);
  }
  return NextResponse.json({ error: `Unsupported offline sync type: ${body.type}` }, { status: 400 });
}
