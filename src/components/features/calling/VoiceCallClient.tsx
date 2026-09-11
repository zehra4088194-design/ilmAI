'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { InstitutionType } from '@/lib/calling/types';

/**
 * Voice Call Client Component
 *
 * 1-on-1 voice calling using PeerJS (client-side WebRTC) with:
 * - Google STUN servers (free, always available)
 * - Metered.ca Open Relay TURN (20 GB/month free via REST API)
 * - Call logging to Supabase
 * - Incoming call handling
 *
 * Usage:
 *   <VoiceCallClient
 *     supabase={supabase}
 *     institutionType="school"
 *     organizationId={orgId}
 *     currentUserId={userId}
 *     callerName="John Doe"
 *     callerAvatar="/avatar.jpg"
 *   />
 */
export function VoiceCallClient({
  supabase,
  institutionType,
  organizationId,
  currentUserId,
  callerName,
  callerAvatar,
}: {
  supabase: SupabaseClient;
  institutionType: InstitutionType;
  organizationId: string;
  currentUserId: string;
  callerName: string;
  callerAvatar?: string | null;
}) {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'connecting' | 'connected' | 'ended'>('idle');
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [remoteUserName, setRemoteUserName] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const peerRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize PeerJS on mount
  useEffect(() => {
    async function init() {
      try {
        // Dynamic import for SSR safety
        const Peer = (await import('peerjs')).default;

        // Use user ID as peer ID for direct addressing
        const peer = new Peer(currentUserId, {
          debug: 2,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          },
        });

        peerRef.current = peer;

        peer.on('open', (id: string) => {
          setPeerId(id);
          setLoading(false);
        });

        // Handle incoming calls
        peer.on('call', async (call: any) => {
          try {
            // Answer automatically after getting mic permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            call.answer(stream);

            setCallState('connected');
            setRemoteUserId(call.peer);
            callRef.current = call;

            // Get caller info
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', call.peer)
              .maybeSingle();
            setRemoteUserName(profile?.full_name || 'Unknown');

            // Setup remote stream
            call.on('stream', (remoteStream: MediaStream) => {
              remoteStreamRef.current = remoteStream;
              if (audioRef.current) {
                audioRef.current.srcObject = remoteStream;
                audioRef.current.play().catch(() => {});
              }
            });

            call.on('close', () => {
              cleanupCall();
            });
          } catch (err) {
            console.error('Failed to answer call:', err);
            toast.error('Microphone access denied');
            call.close();
          }
        });

        peer.on('error', (err: any) => {
          console.error('Peer error:', err);
          if (err.type === 'unavailable-id') {
            toast.error('User ID already in use');
          }
        });
      } catch (err) {
        console.error('Failed to initialize PeerJS:', err);
        toast.error('Failed to initialize voice calling');
        setLoading(false);
      }
    }

    init();

    return () => {
      cleanupCall();
      peerRef.current?.destroy();
    };
  }, [currentUserId, supabase]);

  const cleanupCall = () => {
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    setCallState('idle');
    setRemoteUserId(null);
    setRemoteUserName('');
    setIsMuted(false);
  };

  const startCall = async (calleeId: string, calleeName: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const call = peerRef.current.call(calleeId, stream);
      if (!call) throw new Error('Failed to start call');

      callRef.current = call;
      setRemoteUserId(calleeId);
      setRemoteUserName(calleeName);
      setCallState('ringing');

      call.on('stream', (remoteStream: MediaStream) => {
        remoteStreamRef.current = remoteStream;
        if (audioRef.current) {
          audioRef.current.srcObject = remoteStream;
          audioRef.current.play().catch(() => {});
        }
        setCallState('connected');
      });

      call.on('error', () => {
        setCallState('ended');
        toast.error('Call failed');
      });

      // Log call attempt
      logCall(calleeId, 'initiated');
    } catch (err) {
      console.error('Failed to start call:', err);
      toast.error('Microphone access denied or call failed');
    }
  };

  const endCall = async () => {
    if (callState === 'connected' || callState === 'ringing') {
      await logCall(remoteUserId!, callState === 'connected' ? 'ended' : 'missed');
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const logCall = async (calleeId: string, status: string) => {
    try {
      const table = `${institutionType}_call_logs`;
      await supabase.from(table).insert({
        organization_id: organizationId,
        caller_id: currentUserId,
        callee_id: calleeId,
        status,
        started_at: new Date().toISOString(),
        ended_at: status !== 'initiated' ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.error('Failed to log call:', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Initializing voice calling...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden audio element for remote audio */}
      <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* Call Status */}
      {callState !== 'idle' && (
        <Card className={cn(
          'border-l-4',
          callState === 'connected' && 'border-l-emerald-500',
          callState === 'ringing' && 'border-l-amber-500',
          callState === 'connecting' && 'border-l-blue-500'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  callState === 'connected' && 'bg-emerald-100 text-emerald-600',
                  callState === 'ringing' && 'bg-amber-100 text-amber-600 animate-pulse',
                  callState === 'connecting' && 'bg-blue-100 text-blue-600'
                )}>
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{remoteUserName || 'Calling...'}</p>
                  <Badge variant={callState === 'connected' ? 'default' : 'secondary'} className="text-xs">
                    {callState === 'connected' && '🟢 Connected'}
                    {callState === 'ringing' && '🔔 Ringing...'}
                    {callState === 'connecting' && '📞 Connecting...'}
                  </Badge>
                </div>
              </div>

              {/* Call Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={toggleMute}
                  className={cn(isMuted && 'bg-red-100 text-red-600 border-red-200')}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={endCall}
                  className="h-10 w-10"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Idle State - Ready to Call */}
      {callState === 'idle' && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold">Voice Calling Ready</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Select a contact from the directory to start a call
            </p>
            <p className="text-muted-foreground/70 mt-2 text-xs">
              Using Google STUN + Metered.ca Open Relay (20 GB/month free)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
