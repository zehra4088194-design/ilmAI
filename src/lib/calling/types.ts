// The person-to-person web voice feature is currently disabled in favor of normal phone dialing.
// These shared types remain for compatibility with the legacy calling code.
export type InstitutionType = 'school' | 'college' | 'consumer';

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
  enabled: true,
  allow_student_student: true,
  allow_student_staff: true,
  allow_parent_staff: true,
};

export type CallDirectoryEntry = {
  profile_id: string;
  full_name: string | null;
  avatar_url: string | null;
  member_role: string;
  phone: string | null;
};

export type CallPermissionResult = {
  allowed: boolean;
  reason?: string;
};

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
