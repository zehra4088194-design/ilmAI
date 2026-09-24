'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mic, MicOff, PhoneOff, Loader2, Volume2 } from 'lucide-react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useIsSpeaking,
  VideoTrack,
  BarVisualizer,
} from '@livekit/components-react';
import { Track, type Participant } from 'livekit-client';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';

type CallRole = 'teacher' | 'student';

interface QuranCallRoomProps {
  groupId: string;
  groupName: string;
  role: CallRole;
  onLeave: () => void;
}

/**
 * Fetches a room token then mounts <LiveKitRoom>. Everything below that needs
 * LiveKit's React context (tracks, participants, mute controls) lives in
 * <QuranCallInner>, which can only render once inside <LiveKitRoom>.
 */
export function QuranCallRoom({ groupId, groupName, role, onLeave }: QuranCallRoomProps) {
  const [connection, setConnection] = useState<{ token: string; url: string; roomName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/quran/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not join the call.');
        return json;
      })
      .then((json) => {
        if (!cancelled) setConnection({ token: json.token, url: json.url, roomName: json.roomName });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not join the call.');
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    if (!connection) return;
    // Best-effort attendance log; failures here should never block the call itself.
    void fetch('/api/quran/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, event: 'join' }),
    }).catch(() => {});
    return () => {
      void fetch('/api/quran/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, event: 'leave' }),
      }).catch(() => {});
    };
  }, [connection, groupId]);

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-8 text-center">
        <p className="text-destructive text-sm font-medium">{error}</p>
        <Button variant="outline" onClick={onLeave}>
          Back
        </Button>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={connection.url}
      token={connection.token}
      connect
      audio
      video={role === 'teacher'}
      onDisconnected={onLeave}
      data-lk-theme="default"
      className="min-h-[70vh]"
    >
      <RoomAudioRenderer />
      <QuranCallInner groupName={groupName} role={role} roomName={connection.roomName} onLeave={onLeave} />
    </LiveKitRoom>
  );
}

function QuranCallInner({
  groupName,
  role,
  roomName,
  onLeave,
}: {
  groupName: string;
  role: CallRole;
  roomName: string;
  onLeave: () => void;
}) {
  const participants = useParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const micTracks = useTracks([Track.Source.Microphone]);
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  const teacherCameraTrack = useMemo(() => cameraTracks[0], [cameraTracks]);
  const ownCameraTrack = useMemo(() => cameraTracks.find((t) => t.participant.isLocal), [cameraTracks]);
  const remoteParticipants = useMemo(() => participants.filter((p) => !p.isLocal), [participants]);

  const toggleOwnMic = useCallback(() => {
    void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [localParticipant, isMicrophoneEnabled]);

  const muteParticipant = useCallback(
    async (identity: string, muted: boolean) => {
      const publication = micTracks.find((t) => t.participant.identity === identity)?.publication;
      if (!publication?.trackSid) return;
      await fetch('/api/quran/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, participantIdentity: identity, trackSid: publication.trackSid, muted }),
      }).catch(() => {});
    },
    [micTracks, roomName]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{groupName}</p>
          <p className="text-muted-foreground text-xs">{role === 'teacher' ? 'You are broadcasting' : 'Live now'}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={onLeave}>
          <PhoneOff className="h-4 w-4" /> Leave
        </Button>
      </div>

      {role === 'teacher' ? (
        <>
          {/* WhatsApp-call-style self preview — the teacher only ever sees their own camera. */}
          <div className="relative mx-auto aspect-video w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-lg">
            {ownCameraTrack ? (
              <VideoTrack trackRef={ownCameraTrack} className="h-full w-full object-cover" />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">Starting camera…</div>
            )}
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
              You
            </span>
          </div>

          <div>
            <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase">
              <Volume2 className="h-3.5 w-3.5" /> Students ({remoteParticipants.length})
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {remoteParticipants.map((participant) => (
                <StudentVoiceTile
                  key={participant.identity}
                  participant={participant}
                  micTrack={micTracks.find((t) => t.participant.identity === participant.identity)}
                  onMute={(muted) => muteParticipant(participant.identity, muted)}
                />
              ))}
              {remoteParticipants.length === 0 && (
                <p className="text-muted-foreground col-span-full text-sm">Waiting for students to join…</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
            {teacherCameraTrack ? (
              <VideoTrack trackRef={teacherCameraTrack} className="h-full w-full object-cover" />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Waiting for the teacher to start their camera…
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant={isMicrophoneEnabled ? 'outline' : 'secondary'} size="sm" onClick={toggleOwnMic}>
              {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {isMicrophoneEnabled ? 'Mic on' : 'Mic off'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function StudentVoiceTile({
  participant,
  micTrack,
  onMute,
}: {
  participant: Participant;
  micTrack: ReturnType<typeof useTracks>[number] | undefined;
  onMute: (muted: boolean) => void;
}) {
  const isSpeaking = useIsSpeaking(participant);
  const isMuted = micTrack?.publication?.isMuted ?? true;

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
        isSpeaking ? 'border-emerald-500 bg-emerald-500/10' : 'border-border bg-card/60'
      }`}
    >
      <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold">
        {(participant.name || participant.identity).slice(0, 1).toUpperCase()}
      </div>
      <p className="w-full truncate text-center text-xs font-medium">{participant.name || 'Student'}</p>
      {micTrack ? (
        <BarVisualizer track={micTrack} barCount={5} options={{ minHeight: 20, maxHeight: 100 }} className="h-6 w-full" />
      ) : (
        <div className="h-6" />
      )}
      <Button variant={isMuted ? 'outline' : 'secondary'} size="icon-sm" onClick={() => onMute(!isMuted)} title={isMuted ? 'Unmute' : 'Mute'}>
        {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
