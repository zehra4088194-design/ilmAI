'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ActiveCallInfo, CallIdentity, InstitutionType } from '@/lib/calling/types';

/**
 * Legacy person-to-person browser calling is intentionally disabled.
 *
 * The provider is kept as a compatibility shell so existing layouts/imports do not break, but it
 * no longer creates a Supabase Realtime channel, PeerJS connection, microphone stream, incoming
 * call modal, or active call bar. Directory actions use normal phone dialing instead.
 */
export type IncomingCallState = {
  callId: string;
  fromId: string;
  fromName: string;
  fromAvatarUrl: string | null;
  peerId: string;
  institutionType: InstitutionType;
  organizationId: string;
};

export type CallTarget = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  phone?: string | null;
};

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected';

type CallingContextValue = {
  identity: CallIdentity | null;
  status: CallStatus;
  incomingCall: IncomingCallState | null;
  activeCall: (ActiveCallInfo & { target: CallTarget }) | null;
  isMuted: boolean;
  error: string | null;
  startCall: (
    institutionType: InstitutionType,
    organizationId: string,
    target: CallTarget
  ) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
};

const CallingContext = createContext<CallingContextValue | null>(null);

export function useCalling() {
  return useContext(CallingContext);
}

export function CallProvider({
  children,
}: {
  identity: CallIdentity | null;
  children: ReactNode;
}) {
  return <>{children}</>;
}
