// Shared types for the voice-calling feature. Deliberately institution-agnostic (works the same
// for a school_* org and a college_* org) since the calling settings/logs/directory RPC schema is
// an identical mirror on both sides (see supabase/migrations/20260910120000_voice_calling.sql).

export type InstitutionType = 'school' | 'college';

/** A caller/callee's minimal identity, enough to gate a call and open a signaling channel. */
export type CallIdentity = {
  userId: string;
  institutionType: InstitutionType;
  organizationId: string;
  role: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type CallingSettings = {
  organization_id: string;
  enabled: boolean;
  allow_student_student: boolean;
  allow_student_staff: boolean;
  allow_parent_staff: boolean;
};

export const DEFAULT_CALLING_SETTINGS: Omit<CallingSettings, 'organization_id'> = {
  enabled: false,
  allow_student_student: true,
  allow_student_staff: true,
  allow_parent_staff: true,
};

/** A directory entry returned by {school,college}_call_directory(). */
export type CallDirectoryEntry = {
  profile_id: string;
  full_name: string | null;
  avatar_url: string | null;
  member_role: string;
};

export type CallPermissionResult = {
  allowed: boolean;
  reason?: string;
};

/** One row of live call state, shared between the ringing modal and the active-call bar. */
export type ActiveCallInfo = {
  callId: string;
  peerId: string;
  remoteUserId: string;
  remoteName: string;
  remoteAvatarUrl: string | null;
  direction: 'outgoing' | 'incoming';
  institutionType: InstitutionType;
  organizationId: string;
};
