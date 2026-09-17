'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { getIceServers } from '@/lib/calling/peer-config';
import { requestCallPermission, updateCallStatus } from '@/lib/calling/actions';
import type { ActiveCallInfo, CallIdentity, InstitutionType } from '@/lib/calling/types';
import { IncomingCallModal } from './IncomingCallModal';
import { ActiveCallBar } from './ActiveCallBar';

type CallSignal =
  | { type: 'invite'; callId: string; fromId: string; fromName: string; fromAvatarUrl: string | null; peerId: string; institutionType: InstitutionType; organizationId: string }
  | { type: 'accepted'; callId: string; peerId: string }
  | { type: 'declined'; callId: string }
  | { type: 'cancelled'; callId: string }
  | { type: 'ended'; callId: string };

export type IncomingCallState = {
  callId: string; fromId: string; fromName: string; fromAvatarUrl: string | null; peerId: string; institutionType: InstitutionType; organizationId: string;
};
export type CallTarget = { userId: string; name: string; avatarUrl: string | null };
type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected';
type CallingContextValue = {
  identity: CallIdentity | null; status: CallStatus; incomingCall: IncomingCallState | null;
  activeCall: (ActiveCallInfo & { target: CallTarget }) | null; isMuted: boolean; error: string | null;
  startCall: (institutionType: InstitutionType, organizationId: string, target: CallTarget) => Promise<void>;
  acceptIncomingCall: () => Promise<void>; declineIncomingCall: () => void; endCall: () => void; toggleMute: () => void;
};

const CallingContext = createContext<CallingContextValue | null>(null);
export function useCalling() { return useContext(CallingContext); }

function microphoneErrorMessage(error: unknown) {
  const name = typeof error === 'object' && error && 'name' in error ? String((error as { name?: unknown }).name) : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'Microphone permission was denied. Allow microphone access for ilmai.study and try again.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'The microphone is busy or unavailable. Close other apps using it and try again.';
  return 'Could not access the microphone. Check your browser permission and try again.';
}

export function CallProvider({ identity, children }: { identity: CallIdentity | null; children: ReactNode }) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(null);
  const [activeCall, setActiveCall] = useState<(ActiveCallInfo & { target: CallTarget }) | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaConnectionRef = useRef<any>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const send = useCallback(async (toUserId: string, signal: CallSignal) => {
    const channel = supabaseRef.current.channel(`call-${toUserId}`, { config: { broadcast: { self: false } } });
    await channel.subscribe();
    await channel.send({ type: 'broadcast', event: 'call-signal', payload: signal });
    supabaseRef.current.removeChannel(channel);
  }, []);

  const playRemoteAudio = useCallback(async () => {
    const audio = remoteAudioRef.current;
    if (!audio || !audio.srcObject) return;
    audio.muted = false;
    audio.volume = 1;
    try { await audio.play(); } catch (err) {
      console.debug('Remote call audio playback is waiting for a user gesture.', err);
    }
  }, []);

  const attachRemoteStream = useCallback((stream: MediaStream) => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.srcObject = stream;
    audio.muted = false;
    audio.volume = 1;
    (audio as any).playsInline = true;
    void playRemoteAudio();
  }, [playRemoteAudio]);

  const cleanupMedia = useCallback(() => {
    mediaConnectionRef.current?.close?.();
    mediaConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) { remoteAudioRef.current.pause(); remoteAudioRef.current.srcObject = null; }
  }, []);

  const resetToIdle = useCallback(() => {
    cleanupMedia(); setActiveCall(null); setIncomingCall(null); setStatus('idle'); setIsMuted(false);
  }, [cleanupMedia]);

  const ensurePeer = useCallback(async () => {
    if (peerRef.current && !peerRef.current.destroyed) return peerRef.current;
    const { Peer } = await import('peerjs');
    const peer = new Peer({ config: { iceServers: getIceServers() } });
    await new Promise<void>((resolve, reject) => {
      peer.once('open', () => resolve());
      peer.once('error', (err: Error) => reject(err));
    });
    peerRef.current = peer;
    return peer;
  }, []);

  const endCall = useCallback(() => {
    const call = activeCall;
    if (call) {
      updateCallStatus(call.institutionType, call.callId, 'ended').catch(() => {});
      send(call.remoteUserId, { type: 'ended', callId: call.callId }).catch(() => {});
    }
    resetToIdle();
  }, [activeCall, resetToIdle, send]);

  const startCall = useCallback(async (institutionType: InstitutionType, organizationId: string, target: CallTarget) => {
    setError(null);
    const verdict = await requestCallPermission(institutionType, organizationId, target.userId);
    if (!verdict.allowed || !verdict.callId) { setError(verdict.reason || 'This call is not allowed.'); return; }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(microphoneErrorMessage(err));
      return;
    }

    try {
      localStreamRef.current = stream;
      const peer = await ensurePeer();
      setStatus('calling');
      setActiveCall({ callId: verdict.callId, peerId: peer.id, remoteUserId: target.userId, remoteName: target.name, remoteAvatarUrl: target.avatarUrl, direction: 'outgoing', institutionType, organizationId, target });
      peer.once('call', (call: any) => {
        call.answer(stream); mediaConnectionRef.current = call;
        call.on('stream', (remoteStream: MediaStream) => { attachRemoteStream(remoteStream); setStatus('connected'); updateCallStatus(institutionType, verdict.callId!, 'accepted').catch(() => {}); });
        call.on('close', resetToIdle);
      });
      if (!identity) return;
      await send(target.userId, { type: 'invite', callId: verdict.callId, fromId: identity.userId, fromName: identity.fullName || 'Someone', fromAvatarUrl: identity.avatarUrl, peerId: peer.id, institutionType, organizationId });
    } catch (err) {
      console.error('Call start failed after microphone access:', err);
      setError('Could not start the call. Check your connection and try again.');
      resetToIdle();
    }
  }, [attachRemoteStream, ensurePeer, identity, resetToIdle, send]);

  const acceptIncomingCall = useCallback(async () => {
    const invite = incomingCall;
    if (!invite) return;
    setIncomingCall(null); setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(microphoneErrorMessage(err));
      setIncomingCall(invite);
      setStatus('ringing');
      return;
    }

    try {
      localStreamRef.current = stream;
      const peer = await ensurePeer();
      const call = peer.call(invite.peerId, stream);
      mediaConnectionRef.current = call;
      setActiveCall({ callId: invite.callId, peerId: peer.id, remoteUserId: invite.fromId, remoteName: invite.fromName, remoteAvatarUrl: invite.fromAvatarUrl, direction: 'incoming', institutionType: invite.institutionType, organizationId: invite.organizationId, target: { userId: invite.fromId, name: invite.fromName, avatarUrl: invite.fromAvatarUrl } });
      call.on('stream', (remoteStream: MediaStream) => { attachRemoteStream(remoteStream); setStatus('connected'); });
      call.on('close', resetToIdle);
      await updateCallStatus(invite.institutionType, invite.callId, 'accepted');
      await send(invite.fromId, { type: 'accepted', callId: invite.callId, peerId: peer.id });
    } catch (err) {
      console.error('Incoming call accept failed after microphone access:', err);
      setError('Could not connect the call. Check your connection and try again.');
      resetToIdle();
    }
  }, [attachRemoteStream, ensurePeer, incomingCall, resetToIdle, send]);

  const declineIncomingCall = useCallback(() => {
    const invite = incomingCall;
    if (!invite) return;
    updateCallStatus(invite.institutionType, invite.callId, 'declined').catch(() => {});
    send(invite.fromId, { type: 'declined', callId: invite.callId }).catch(() => {});
    setIncomingCall(null); setStatus('idle');
  }, [incomingCall, send]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current; if (!stream) return;
    const nextMuted = !isMuted; stream.getAudioTracks().forEach((track) => (track.enabled = !nextMuted)); setIsMuted(nextMuted);
  }, [isMuted]);

  useEffect(() => {
    if (!identity) return;
    const channel = supabaseRef.current.channel(`call-${identity.userId}`, { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'call-signal' }, ({ payload }: { payload: CallSignal }) => {
      if (payload.type === 'invite') {
        setIncomingCall({ callId: payload.callId, fromId: payload.fromId, fromName: payload.fromName, fromAvatarUrl: payload.fromAvatarUrl, peerId: payload.peerId, institutionType: payload.institutionType, organizationId: payload.organizationId });
        setStatus('ringing');
      } else if (payload.type === 'declined' || payload.type === 'cancelled') {
        setError(payload.type === 'declined' ? 'Call declined.' : 'Call cancelled.'); resetToIdle();
      } else if (payload.type === 'ended') resetToIdle();
    });
    channel.subscribe(); channelRef.current = channel;
    return () => { supabaseRef.current.removeChannel(channel); channelRef.current = null; };
  }, [identity?.userId, resetToIdle]);

  useEffect(() => {
    const handleGesture = () => { void playRemoteAudio(); };
    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('touchend', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture);
    return () => { window.removeEventListener('pointerdown', handleGesture); window.removeEventListener('touchend', handleGesture); window.removeEventListener('keydown', handleGesture); };
  }, [playRemoteAudio]);

  useEffect(() => () => { cleanupMedia(); peerRef.current?.destroy?.(); }, [cleanupMedia]);

  if (!identity) return <>{children}</>;

  return (
    <CallingContext.Provider value={{ identity, status, incomingCall, activeCall, isMuted, error, startCall, acceptIncomingCall, declineIncomingCall, endCall, toggleMute }}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline preload="auto" className="pointer-events-none fixed h-px w-px opacity-0" />
      {incomingCall && <IncomingCallModal name={incomingCall.fromName} avatarUrl={incomingCall.fromAvatarUrl} onAccept={acceptIncomingCall} onDecline={declineIncomingCall} />}
      {activeCall && (status === 'calling' || status === 'connected') && <ActiveCallBar name={activeCall.target.name} avatarUrl={activeCall.target.avatarUrl} connected={status === 'connected'} isMuted={isMuted} onToggleMute={toggleMute} onEndCall={endCall} />}
      {error && !incomingCall && !activeCall && <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">{error}</div>}
    </CallingContext.Provider>
  );
}
