'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Lock, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { SubscriptionTier } from '@/types';

// ============================================
// LIVE VOICE CALL — talk to the AI Teacher out loud
// ============================================
// Flow:
// 1. POST /api/ai/live/session -> { token, wsUrl, model } (server mints a
//    short-lived, single-use Gemini ephemeral token; persona AND audio
//    transcription are locked in server-side — see cloudflare-worker/worker.js)
// 2. Browser opens its OWN WebSocket straight to Gemini Live using that
//    token — audio never touches our servers.
// 3. Mic audio is captured, downsampled to 16-bit PCM @ 16kHz, base64'd,
//    and streamed as realtimeInput messages.
// 4. Incoming audio (24kHz PCM16) is queued and played back gaplessly.
// 5. Because the token locks in inputAudioTranscription/outputAudioTranscription,
//    Gemini also streams back TEXT transcripts of both sides of the
//    conversation. We accumulate those client-side, and when the call ends
//    we hand the transcript to onSessionEnd — the parent (ChatInterface)
//    POSTs it to /api/voice/session-end, which turns it into Short Notes +
//    Flashcards in the student's existing collections (Magic Note Generator).
//
// ACCESS: plan-config controlled (see /api/ai/live/session for the server-side
// enforcement — this component's own gate is a UX nicety, not the real check).
//
// KNOWN LIMITATION (documented, not hidden): this uses a ScriptProcessorNode
// for mic capture instead of an AudioWorklet. ScriptProcessorNode is
// deprecated but works in every browser without shipping an extra static
// worklet file — for a first version that's a reasonable trade. If mic
// capture ever feels janky on low-end devices, migrating to an AudioWorklet
// is the natural next step.
// ============================================

type CallState = 'idle' | 'connecting' | 'active' | 'ending';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// A voice lesson shorter than this isn't worth turning into notes — avoids
// noise from accidental taps or instant hang-ups.
const MIN_TRANSCRIPT_WORDS = 40;

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (outputRate === inputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = buffer[Math.floor(i * ratio)] ?? 0;
  }
  return result;
}

function base64FromInt16(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary);
}

function int16FromBase64(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

export interface VoiceSessionTranscript {
  /** Combined transcript, speaker-labelled, in chronological order. */
  text: string;
  wordCount: number;
}

interface LiveVoiceCallProps {
  subject?: string;
  /** True only when this user's plan has Live Voice enabled. */
  hasAccess: boolean;
  userTier?: SubscriptionTier;
  /** Fired once, right after the call ends, if the transcript is substantial. */
  onSessionEnd?: (transcript: VoiceSessionTranscript) => void;
}

export function LiveVoiceCall({ subject, hasAccess, userTier = 'FREE', onSessionEnd }: LiveVoiceCallProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextPlaybackTimeRef = useRef(0);

  // Transcript accumulation — one entry per turn, in order. Gemini streams
  // transcription in small incremental chunks per message, so we append to
  // whichever speaker is "current" rather than replacing.
  const transcriptRef = useRef<{ speaker: 'student' | 'teacher'; text: string }[]>([]);

  const resetTranscript = useCallback(() => {
    transcriptRef.current = [];
  }, []);

  const appendTranscript = (speaker: 'student' | 'teacher', chunk: string) => {
    if (!chunk) return;
    const entries = transcriptRef.current;
    const last = entries[entries.length - 1];
    if (last && last.speaker === speaker) {
      last.text += chunk;
    } else {
      entries.push({ speaker, text: chunk });
    }
  };

  const cleanup = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    micContextRef.current?.close().catch(() => {});
    micContextRef.current = null;
    playbackContextRef.current?.close().catch(() => {});
    playbackContextRef.current = null;
    nextPlaybackTimeRef.current = 0;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setAiSpeaking(false);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const comingSoonTitle = userTier === 'FREE' ? 'Voice Call coming soon' : 'Voice Call coming soon for your plan';

  const playIncomingAudio = (base64Pcm: string) => {
    if (!playbackContextRef.current) return;
    const ctx = playbackContextRef.current;
    const int16 = int16FromBase64(base64Pcm);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = (int16[i] ?? 0) / 0x8000;

    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, nextPlaybackTimeRef.current);
    source.start(startAt);
    nextPlaybackTimeRef.current = startAt + buffer.duration;
  };

  const handleServerMessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.setupComplete) return;

      const parts = msg.serverContent?.modelTurn?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('audio/')) {
            setAiSpeaking(true);
            playIncomingAudio(part.inlineData.data);
          }
        }
      }

      // Locked in server-side via the ephemeral token (inputAudioTranscription /
      // outputAudioTranscription) — see cloudflare-worker/worker.js.
      const inputText = msg.serverContent?.inputTranscription?.text;
      if (inputText) appendTranscript('student', inputText);

      const outputText = msg.serverContent?.outputTranscription?.text;
      if (outputText) appendTranscript('teacher', outputText);

      if (msg.serverContent?.interrupted) {
        // Student started talking over the AI — stop whatever's queued
        nextPlaybackTimeRef.current = 0;
        setAiSpeaking(false);
      }

      if (msg.serverContent?.turnComplete) {
        setAiSpeaking(false);
      }
    } catch {
      // Non-JSON frame — ignore
    }
  };

  const startCall = async () => {
    if (!hasAccess) {
      toast.error('Live Voice Call is locked on your current plan. Upgrade to continue.');
      return;
    }

    resetTranscript();
    setCallState('connecting');
    try {
      const res = await fetch('/api/ai/live/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        setCallState('idle');
        return;
      }

      const { token, wsUrl, model } = json.data;

      // Ask for mic permission BEFORE opening the socket so we fail fast
      // with a clear error if the student denies it.
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      micStreamRef.current = micStream;

      const ws = new WebSocket(`${wsUrl}?access_token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          setup: {
            model: `models/${model}`,
            generationConfig: { responseModalities: ['AUDIO'] },
            // Persona, subject, AND audio transcription are already locked into
            // the token server-side — we deliberately do NOT resend any of that
            // from the browser.
          },
        }));

        // Set up mic capture
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const micContext = new AudioContextClass();
        micContextRef.current = micContext;
        const source = micContext.createMediaStreamSource(micStream);
        const processor = micContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          const downsampled = downsampleBuffer(input, micContext.sampleRate, INPUT_SAMPLE_RATE);
          const pcm16 = floatTo16BitPCM(downsampled);
          ws.send(JSON.stringify({
            realtimeInput: { audio: { data: base64FromInt16(pcm16), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` } },
          }));
        };

        source.connect(processor);
        processor.connect(micContext.destination);

        // Separate context for playback since input/output sample rates differ
        playbackContextRef.current = new AudioContextClass();

        setCallState('active');
      };

      ws.onmessage = handleServerMessage;

      ws.onerror = () => {
        toast.error('The voice call encountered a connection issue.');
        cleanup();
        setCallState('idle');
      };

      ws.onclose = () => {
        cleanup();
        setCallState('idle');
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Allow microphone access to start the call.');
      } else {
        toast.error('The call could not be started. Please try again.');
      }
      cleanup();
      setCallState('idle');
    }
  };

  const endCall = () => {
    setCallState('ending');
    cleanup();
    setCallState('idle');

    // Turn the accumulated transcript into Short Notes + Flashcards, if the
    // call was substantial enough to be worth it.
    const combined = transcriptRef.current
      .map((t) => `${t.speaker === 'student' ? 'Student' : 'AI Teacher'}: ${t.text.trim()}`)
      .join('\n');
    const wordCount = combined.split(/\s+/).filter(Boolean).length;

    if (wordCount >= MIN_TRANSCRIPT_WORDS && onSessionEnd) {
      onSessionEnd({ text: combined, wordCount });
    }
    resetTranscript();
  };

  if (comingSoonTitle) {
    return (
      <Button variant="outline" size="sm" disabled className="border-amber-400/40 bg-amber-400/10 text-amber-500" title={comingSoonTitle}>
        <Mic className="w-3.5 h-3.5" /> Voice Call Coming Soon
      </Button>
    );
  }

  if (!hasAccess) {
    return (
      <Button variant="outline" size="sm" disabled className="opacity-60" title="Live Voice Call is locked on your current plan">
        <Lock className="w-3.5 h-3.5" /> Voice Call
      </Button>
    );
  }

  if (callState === 'idle') {
    return (
      <Button variant="outline" size="sm" onClick={startCall}>
        <Phone className="w-3.5 h-3.5" /> Voice Call
      </Button>
    );
  }

  if (callState === 'connecting') {
    return (
      <Button variant="outline" size="sm" disabled>
        Connecting...
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 text-xs font-medium text-violet-400">
        {aiSpeaking ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
            </span>
            AI is speaking...
          </>
        ) : (
          <>
            <Mic className="w-3 h-3" /> Listening...
          </>
        )}
      </div>
      <Button variant="destructive" size="sm" onClick={endCall}>
        <PhoneOff className="w-3.5 h-3.5" /> End Call
      </Button>
    </div>
  );
}
