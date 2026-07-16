'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, CheckCheck, Crown, LockKeyhole, MessageCircle, Send, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type StudentProfile = {
  id: string;
  full_name: string;
  email: string;
  username?: string | null;
  subscription_tier: 'FREE' | 'PRO' | 'ELITE';
  grade_level?: string | null;
  board?: string | null;
  gender?: 'girl' | 'boy' | null;
};

type ChatRequest = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  moderation_warning_count?: number;
  moderation_blocked_until?: string | null;
  moderation_last_reason?: string | null;
  requester: StudentProfile | null;
  recipient: StudentProfile | null;
};

type ChatMessage = {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
};

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function StudentChatClient() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const settings = usePlatformSettings();
  const [identifier, setIdentifier] = useState('');
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [moderationAlert, setModerationAlert] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const requestedChatId = searchParams.get('requestId');

  const userTier = user?.subscriptionTier || 'FREE';
  const canUseStudentChat = settings.subscriptionPlans[userTier].access.studentChat;
  const approved = requests.filter((request) => request.status === 'approved');
  const incoming = requests.filter((request) => request.status === 'pending' && request.recipient_id === user?.id);
  const outgoing = requests.filter((request) => request.status === 'pending' && request.requester_id === user?.id);
  const selected = approved.find((request) => request.id === selectedId) || approved[0] || null;

  const selectedBuddy = useMemo(() => {
    if (!selected || !user) return null;
    return selected.requester_id === user.id ? selected.recipient : selected.requester;
  }, [selected, user]);
  const selectedBlockedUntil =
    selected?.moderation_blocked_until && new Date(selected.moderation_blocked_until).getTime() > Date.now()
      ? selected.moderation_blocked_until
      : null;

  const loadRequests = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/student-chat/requests');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Requests load nahi hui');
      setRequests(json.requests || []);
      const requested = json.requests?.find(
        (request: ChatRequest) => request.status === 'approved' && request.id === requestedChatId
      );
      if (requested) {
        setSelectedId(requested.id);
      } else if (!selectedId && json.requests?.some((request: ChatRequest) => request.status === 'approved')) {
        setSelectedId(json.requests.find((request: ChatRequest) => request.status === 'approved')?.id || null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Requests load nahi hui');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadMessages = async (requestId: string) => {
    try {
      const res = await fetch(`/api/student-chat/messages?requestId=${requestId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Messages load nahi hue');
      setMessages(json.messages || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Messages load nahi hue');
    }
  };

  const markSelectedRead = async (requestId: string) => {
    await fetch('/api/student-chat/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    }).catch(() => {});
  };

  const upsertMessage = useCallback((next: ChatMessage) => {
    setMessages((items) => {
      if (items.some((item) => item.id === next.id)) {
        return items.map((item) => (item.id === next.id ? next : item));
      }
      return [...items, next].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
  }, []);

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`student_chat_requests_live:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_chat_requests' }, () => {
        void loadRequests(false);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.id]);

  useEffect(() => {
    if (!selected?.id) {
      setMessages([]);
      setModerationAlert(null);
      return;
    }
    setModerationAlert(null);
    loadMessages(selected.id);
    markSelectedRead(selected.id);
    const timer = window.setInterval(() => loadMessages(selected.id), 10000);
    const channel = supabase
      .channel(`student_chat_messages:${selected.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'student_chat_messages', filter: `request_id=eq.${selected.id}` },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          upsertMessage(incoming);
          if (incoming.sender_id !== user?.id) {
            markSelectedRead(selected.id)
              .then(() => loadMessages(selected.id))
              .catch(() => {});
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'student_chat_messages', filter: `request_id=eq.${selected.id}` },
        (payload) => upsertMessage(payload.new as ChatMessage)
      )
      .subscribe();

    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [selected?.id, supabase, upsertMessage, user?.id]);

  const sendRequest = async () => {
    if (!identifier.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/student-chat/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientIdentifier: identifier }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request send nahi hui');
      setIdentifier('');
      toast.success('Study buddy request send ho gayi');
      await loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request send nahi hui');
    } finally {
      setSending(false);
    }
  };

  const updateRequest = async (requestId: string, status: 'approved' | 'declined') => {
    try {
      const res = await fetch('/api/student-chat/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request update nahi hui');
      toast.success(status === 'approved' ? 'Request approved' : 'Request declined');
      await loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request update nahi hui');
    }
  };

  const sendMessage = async () => {
    if (!selected || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/student-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: selected.id, content: message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Message send nahi hua');
      upsertMessage(json.message);
      setMessage('');
      if (json.moderation?.alert) {
        setModerationAlert(json.moderation.alert);
        if (json.moderation.action === 'blocked') await loadRequests();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Message send nahi hua');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/25 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--accent)/0.18),hsl(var(--secondary)/0.18))] shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="bg-primary text-primary-foreground mb-2">Request-first safe chat</Badge>
            <h1 className="text-2xl font-bold">Study Buddies</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Student ke unique username (ya email) se request bhejo. Approval ke baad chat open hogi; messaging
              Pro/Elite feature hai.
            </p>
          </div>
          {!canUseStudentChat && (
            <Button asChild variant="gradient" className="shrink-0">
              <Link href="/subscription">
                <Crown className="h-4 w-4" /> Pro to unlock chat
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="text-primary h-4 w-4" /> Send Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="@student_username ya email"
              />
              <p className="text-muted-foreground text-xs">Username unique hota hai; @ lagana optional hai.</p>
              <Button variant="gradient" onClick={sendRequest} loading={sending} className="w-full">
                <Send className="h-4 w-4" /> Send study request
              </Button>
            </CardContent>
          </Card>

          {incoming.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Incoming Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {incoming.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    currentUserId={user?.id}
                    actions={
                      <div className="flex gap-2">
                        <Button size="icon-sm" variant="outline" onClick={() => updateRequest(request.id, 'approved')}>
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button size="icon-sm" variant="outline" onClick={() => updateRequest(request.id, 'declined')}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    }
                  />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Approved Chats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
              {!loading && approved.length === 0 && (
                <p className="text-muted-foreground text-sm">Abhi koi approved buddy nahi.</p>
              )}
              {approved.map((request) => {
                const buddy = request.requester_id === user?.id ? request.recipient : request.requester;
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedId(request.id)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-left transition-colors',
                      selected?.id === request.id
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    )}
                  >
                    <p className="text-sm font-semibold">{buddy?.full_name || 'Student'}</p>
                    <p className="text-muted-foreground text-xs">
                      {buddy?.username ? `@${buddy.username}` : buddy?.email}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {outgoing.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pending Sent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outgoing.map((request) => (
                  <RequestRow key={request.id} request={request} currentUserId={user?.id} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="border-primary/20 bg-card/95 min-h-[560px] overflow-hidden shadow-xl shadow-black/5">
          <CardHeader className="border-border/70 bg-muted/20 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="text-primary h-5 w-5" />
              {selectedBuddy ? selectedBuddy.full_name : 'Select a buddy'}
            </CardTitle>
            {selectedBuddy && (
              <p className="text-muted-foreground text-xs">
                {selectedBuddy.username ? `@${selectedBuddy.username}` : selectedBuddy.email}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex h-[500px] flex-col p-0">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="text-muted-foreground mb-3 h-10 w-10" />
                <p className="font-semibold">Approved chat select karo</p>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  Request approve hone ke baad yahan conversation start hogi.
                </p>
              </div>
            ) : (
              <>
                {(moderationAlert || selectedBlockedUntil) && (
                  <div className="border-b border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        {selectedBlockedUntil
                          ? `Ye chat study se hatne ki wajah se ${new Date(selectedBlockedUntil).toLocaleString()} tak blocked hai.`
                          : moderationAlert}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.10),transparent_34%),linear-gradient(180deg,hsl(var(--muted)/0.25),transparent)] p-4">
                  {messages.length === 0 && (
                    <p className="text-muted-foreground text-center text-sm">No messages yet.</p>
                  )}
                  {messages.map((item) => {
                    const mine = item.sender_id === user?.id;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[82%] rounded-2xl border px-3 py-2 text-sm shadow-sm sm:max-w-[78%]',
                            mine
                              ? 'border-primary/20 bg-primary text-primary-foreground shadow-primary/15 rounded-br-md'
                              : 'border-border/70 bg-background/95 text-foreground rounded-bl-md'
                          )}
                        >
                          <p className="leading-5 whitespace-pre-wrap">{item.content}</p>
                          <div
                            className={cn(
                              'mt-1.5 flex items-center gap-1 text-[11px] font-medium',
                              mine ? 'text-primary-foreground/80 justify-end' : 'text-muted-foreground justify-start'
                            )}
                          >
                            <span>{formatMessageTime(item.created_at)}</span>
                            {mine && (
                              <>
                                {item.read_at ? (
                                  <CheckCheck className="text-primary-foreground h-3.5 w-3.5" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                <span>{item.read_at ? 'Seen' : 'Sent'}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {!canUseStudentChat ? (
                  <div className="border-border border-t p-4">
                    <div className="bg-muted/20 rounded-xl border border-dashed p-4 text-center">
                      <LockKeyhole className="text-primary mx-auto mb-2 h-5 w-5" />
                      <p className="font-semibold">Messaging Pro/Elite feature hai</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Free users request bhej aur accept kar sakte hain. Actual chat unlock karne ke liye Pro lo.
                      </p>
                      <Button asChild variant="gradient" size="sm" className="mt-3">
                        <Link href="/subscription">Pro to unlock chat</Link>
                      </Button>
                    </div>
                  </div>
                ) : selectedBlockedUntil ? (
                  <div className="border-border border-t p-4">
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-center text-sm text-amber-700 dark:text-amber-200">
                      <AlertTriangle className="mx-auto mb-2 h-5 w-5" />
                      Chat temporarily blocked hai. Study related baat ke liye block expire hone ka wait karo.
                    </div>
                  </div>
                ) : (
                  <div className="border-border bg-background/95 flex gap-2 border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
                    <Input
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Type your message..."
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') sendMessage();
                      }}
                      className="min-w-0"
                    />
                    <Button
                      variant="default"
                      size="icon"
                      onClick={sendMessage}
                      loading={sending}
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RequestRow({
  request,
  currentUserId,
  actions,
}: {
  request: ChatRequest;
  currentUserId?: string;
  actions?: React.ReactNode;
}) {
  const buddy = request.requester_id === currentUserId ? request.recipient : request.requester;
  return (
    <div className="border-border bg-muted/20 flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{buddy?.full_name || 'Student'}</p>
        <p className="text-muted-foreground truncate text-xs">
          {buddy?.username ? `@${buddy.username}` : buddy?.email}
        </p>
      </div>
      {actions || <Badge variant="outline">Pending</Badge>}
    </div>
  );
}
