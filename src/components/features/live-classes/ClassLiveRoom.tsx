'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneOff, Loader2, Send, Users, Hand, Mic, MicOff } from 'lucide-react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useLocalParticipant,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

type CallRole = 'teacher' | 'student';

type ChatMessage = {
  id: string;
  sender_id: string;
  sender_role: CallRole;
  message: string;
  created_at: string;
  sender_name?: string;
};

type HandStatus = 'raised' | 'granted' | 'lowered';
type HandRaise = { studentId: string; status: HandStatus; name?: string };

interface ClassLiveRoomProps {
  sessionId: string;
  classId: string;
  className: string;
  title: string;
  role: CallRole;
  initialMessages: ChatMessage[];
  initialHandRaises: HandRaise[];
  onEnd: (formData: FormData) => void;
}

/**
 * Fetches a room token then mounts <LiveKitRoom>. The live text chat runs
 * OUTSIDE LiveKit entirely (Supabase Realtime on class_live_chat_messages),
 * so it keeps working even before the video connection is ready and persists
 * as real chat history, unlike a LiveKit data-channel message.
 */
export function ClassLiveRoom({
  sessionId,
  classId,
  className,
  title,
  role,
  initialMessages,
  initialHandRaises,
  onEnd,
}: ClassLiveRoomProps) {
  const router = useRouter();
  const [connection, setConnection] = useState<{ token: string; url: string; roomName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/live-class/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not join the class.');
        return json;
      })
      .then((json) => {
        if (!cancelled) setConnection({ token: json.token, url: json.url, roomName: json.roomName });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not join the class.');
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Student-side best-effort join/leave log; never blocks the class itself.
  useEffect(() => {
    if (!connection || role !== 'student') return;
    void fetch('/api/live-class/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, event: 'join' }),
    }).catch(() => {});
    return () => {
      void fetch('/api/live-class/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, event: 'leave' }),
      }).catch(() => {});
    };
  }, [connection, role, sessionId]);

  // Everyone watches for the session flipping to 'ended' (teacher ending the
  // class force-disconnects LiveKit, but this also surfaces a clean message
  // instead of a raw connection-drop for students).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`class-live-session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'class_live_sessions', filter: `id=eq.${sessionId}` },
        (payload: any) => {
          if (payload.new?.status === 'ended') setEnded(true);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const leave = useCallback(() => router.push(`/teacher/classes/${classId}`), [router, classId]);

  if (ended) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-8 text-center">
        <p className="text-sm font-medium">This class has ended.</p>
        <Button variant="outline" onClick={leave}>
          Back to class
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-8 text-center">
        <p className="text-destructive text-sm font-medium">{error}</p>
        <Button variant="outline" onClick={leave}>
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
      audio={role === 'teacher'}
      video={role === 'teacher'}
      onDisconnected={leave}
      data-lk-theme="default"
      className="min-h-[70vh]"
    >
      <RoomAudioRenderer />
      <ClassLiveInner
        sessionId={sessionId}
        classId={classId}
        className={className}
        title={title}
        role={role}
        initialMessages={initialMessages}
        initialHandRaises={initialHandRaises}
        onLeave={leave}
        onEnd={onEnd}
      />
    </LiveKitRoom>
  );
}

function ClassLiveInner({
  sessionId,
  classId,
  className,
  title,
  role,
  initialMessages,
  initialHandRaises,
  onLeave,
  onEnd,
}: {
  sessionId: string;
  classId: string;
  className: string;
  title: string;
  role: CallRole;
  initialMessages: ChatMessage[];
  initialHandRaises: HandRaise[];
  onLeave: () => void;
  onEnd: (formData: FormData) => void;
}) {
  const participants = useParticipants();
  const nameByIdentity = useMemo(() => new Map(participants.map((p) => [p.identity, p.name])), [participants]);
  const connectedIdentities = useMemo(() => new Set(participants.map((p) => p.identity)), [participants]);
  const cameraTracks = useTracks([Track.Source.Camera]);
  const teacherCameraTrack = useMemo(() => cameraTracks[0], [cameraTracks]);
  const ownCameraTrack = useMemo(() => cameraTracks.find((t) => t.participant.isLocal), [cameraTracks]);
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  // --- Raise hand (students ask to speak; teacher grants/revokes the mic live) ---
  const [handRaises, setHandRaises] = useState<Map<string, HandRaise>>(
    () => new Map(initialHandRaises.map((h) => [h.studentId, h]))
  );
  const [ownHandBusy, setOwnHandBusy] = useState(false);
  const ownHand = handRaises.get(localParticipant.identity);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`class-live-hands:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_live_hand_raises', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          setHandRaises((prev) => {
            const next = new Map(prev);
            next.set(row.student_id, { studentId: row.student_id, status: row.status, name: next.get(row.student_id)?.name });
            return next;
          });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // A revoked/lowered hand should always leave the student silent, whether the
  // teacher revoked it or the student lowered it themselves mid-speech.
  useEffect(() => {
    if (role === 'student' && ownHand?.status !== 'granted' && isMicrophoneEnabled) {
      void localParticipant.setMicrophoneEnabled(false);
    }
  }, [role, ownHand?.status, isMicrophoneEnabled, localParticipant]);

  const toggleOwnHand = useCallback(async () => {
    setOwnHandBusy(true);
    const raise = ownHand?.status !== 'raised' && ownHand?.status !== 'granted';
    try {
      await fetch('/api/live-class/hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, raise }),
      });
      setHandRaises((prev) => {
        const next = new Map(prev);
        next.set(localParticipant.identity, { studentId: localParticipant.identity, status: raise ? 'raised' : 'lowered' });
        return next;
      });
    } finally {
      setOwnHandBusy(false);
    }
  }, [ownHand?.status, sessionId, localParticipant.identity]);

  const grantHand = useCallback(
    async (studentId: string, grant: boolean) => {
      await fetch('/api/live-class/hand-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, studentId, grant }),
      }).catch(() => {});
    },
    [sessionId]
  );

  const raisedHands = useMemo(
    () => Array.from(handRaises.values()).filter((h) => (h.status === 'raised' || h.status === 'granted') && connectedIdentities.has(h.studentId)),
    [handRaises, connectedIdentities]
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`class-live-chat:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'class_live_chat_messages', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new as ChatMessage]));
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setSending(true);
    try {
      await fetch('/api/live-class/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });
    } finally {
      setSending(false);
    }
  }, [draft, sending, sessionId]);

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-muted-foreground text-xs">
              {className} · {role === 'teacher' ? 'You are broadcasting' : 'Live now'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Users className="h-3.5 w-3.5" /> {participants.length}
            </span>
            {role === 'teacher' ? (
              <form action={onEnd}>
                <input type="hidden" name="session_id" value={sessionId} />
                <input type="hidden" name="class_id" value={classId} />
                <Button variant="destructive" size="sm" type="submit">
                  <PhoneOff className="h-4 w-4" /> End class
                </Button>
              </form>
            ) : (
              <Button variant="outline" size="sm" onClick={onLeave}>
                <PhoneOff className="h-4 w-4" /> Leave
              </Button>
            )}
          </div>
        </div>

        <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
          {role === 'teacher' ? (
            ownCameraTrack ? (
              <VideoTrack trackRef={ownCameraTrack} className="h-full w-full object-cover" />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">Starting camera…</div>
            )
          ) : teacherCameraTrack ? (
            <VideoTrack trackRef={teacherCameraTrack} className="h-full w-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Waiting for the teacher to start their camera…
            </div>
          )}
        </div>

        {role === 'student' && (
          <div className="flex items-center justify-center gap-3">
            {ownHand?.status === 'granted' ? (
              <Button
                variant={isMicrophoneEnabled ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
              >
                {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {isMicrophoneEnabled ? "You're live — tap to mute" : 'Tap to speak'}
              </Button>
            ) : (
              <Button
                variant={ownHand?.status === 'raised' ? 'secondary' : 'outline'}
                size="sm"
                disabled={ownHandBusy}
                onClick={() => void toggleOwnHand()}
              >
                <Hand className="h-4 w-4" />
                {ownHand?.status === 'raised' ? 'Hand raised — waiting for teacher' : 'Raise hand to speak'}
              </Button>
            )}
          </div>
        )}

        {role === 'teacher' && raisedHands.length > 0 && (
          <div className="border-border bg-card/60 space-y-2 rounded-xl border p-3">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase">
              <Hand className="h-3.5 w-3.5" /> Raised hands ({raisedHands.length})
            </p>
            {raisedHands.map((hand) => (
              <div key={hand.studentId} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span className="truncate">{nameByIdentity.get(hand.studentId) || hand.name || 'Student'}</span>
                {hand.status === 'granted' ? (
                  <Button size="sm" variant="outline" onClick={() => void grantHand(hand.studentId, false)}>
                    <MicOff className="h-3.5 w-3.5" /> Mute
                  </Button>
                ) : (
                  <Button size="sm" variant="gradient" onClick={() => void grantHand(hand.studentId, true)}>
                    <Mic className="h-3.5 w-3.5" /> Allow to speak
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-border bg-card/60 flex h-[70vh] flex-col rounded-2xl border">
        <p className="text-muted-foreground border-b px-3 py-2 text-xs font-semibold uppercase">Live chat</p>
        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
          {messages.length === 0 && (
            <p className="text-muted-foreground text-center text-xs">No messages yet — say hi!</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className={m.sender_role === 'teacher' ? 'font-semibold text-violet-400' : 'font-semibold'}>
                {m.sender_role === 'teacher' ? 'Teacher' : nameByIdentity.get(m.sender_id) || m.sender_name || 'Student'}:
              </span>{' '}
              <span className="break-words">{m.message}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t p-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            maxLength={500}
            placeholder="Type a message…"
            className="border-input bg-background h-9 flex-1 rounded-lg border px-3 text-sm"
          />
          <Button size="icon-sm" onClick={send} disabled={sending || !draft.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
