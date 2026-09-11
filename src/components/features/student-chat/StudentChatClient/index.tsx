'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, CheckCheck, Crown, LockKeyhole, MessageCircle, Send, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmojiPickerButton } from '@/components/ui/EmojiPickerButton';
import { ChatAttachmentButton } from '@/components/ui/ChatAttachmentButton';
import { ChatAttachmentBubble } from '@/components/ui/ChatAttachmentBubble';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { fetchWithOfflineCache } from '@/lib/offline/read-cache';
import { useOnlineStatus } from '@/hooks/offline/useOnlineStatus';

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
  attachment_signed_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size_kb?: number | null;
};

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function StudentChatClient() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const settings = usePlatformSettings();
  const isOnline = useOnlineStatus();
  const [identifier, setIdentifier] = useState('');
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [moderationAlert, setModerationAlert] = useState<string | null>(null);
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
      // Mirrored to IndexedDB on every successful load (see src/lib/offline/read-cache.ts), so
      // the buddy list and approved threads are still there to look at with no network at all —
      // only sending a new message genuinely needs to be online. The fetcher throws on an
      // app-level error response so a transient server error never overwrites a good cached
      // list with an error blob — fetchWithOfflineCache only mirrors what it never threw on.
      const { data: json } = await fetchWithOfflineCache(`student-chat:requests:${user?.id}`, async () => {
        const res = await fetch('/api/student-chat/requests');
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Requests could not be loaded.');
        return body;
      });
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
      // Offline with nothing cached yet — expected on a first-ever offline visit, not worth a
      // toast, and the 15s poll below would otherwise re-toast this every cycle while offline.
      if (!isOnline) return;
      toast.error(error instanceof Error ? error.message : 'Requests could not be loaded.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadMessages = async (requestId: string) => {
    try {
      const { data: json, fromCache } = await fetchWithOfflineCache(`student-chat:messages:${requestId}`, async () => {
        const res = await fetch(`/api/student-chat/messages?requestId=${requestId}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Messages could not be loaded.');
        return body;
      });
      setMessages(json.messages || []);
      if (fromCache && !isOnline) return; // don't toast — offline is expected, not an error
    } catch (error) {
      if (!isOnline) return; // no cache yet for this thread and we're offline — nothing more to do
      toast.error(error instanceof Error ? error.message : 'Messages could not be loaded.');
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

  // Polls the API route on an interval rather than subscribing to Supabase
  // Realtime (kept simple; can be switched back to Realtime later if needed).
  useEffect(() => {
    if (!user?.id) return;
    const timer = window.setInterval(() => void loadRequests(false), 15000);
    return () => window.clearInterval(timer);
  }, [user?.id]);

  useEffect(() => {
    if (!selected?.id) {
      setMessages([]);
      setModerationAlert(null);
      return;
    }
    setModerationAlert(null);
    loadMessages(selected.id);
    markSelectedRead(selected.id);
    // Same reasoning as above: poll instead of subscribing to Realtime on the chats-DB project.
    const timer = window.setInterval(() => loadMessages(selected.id), 5000);
    return () => window.clearInterval(timer);
  }, [selected?.id, user?.id]);

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
      if (!res.ok) throw new Error(json.error || 'The request could not be sent.');
      setIdentifier('');
      toast.success('Study buddy request sent.');
      await loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The request could not be sent.');
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
      if (!res.ok) throw new Error(json.error || 'The request could not be updated.');
      toast.success(status === 'approved' ? 'Request approved' : 'Request declined');
      await loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The request could not be updated.');
    }
  };

  const deleteChat = async (requestId: string) => {
    if (!window.confirm('Delete this chat? This removes every message and cannot be undone.')) return;
    try {
      const res = await fetch(`/api/student-chat/requests?requestId=${requestId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'The chat could not be deleted.');
      setRequests((items) => items.filter((item) => item.id !== requestId));
      if (selectedId === requestId) setSelectedId(null);
      toast.success('Chat deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The chat could not be deleted.');
    }
  };

  const sendMessage = async (file?: File) => {
    if (!selected || (!message.trim() && !file)) return;
    setSending(true);
    try {
      let res: Response;
      if (file) {
        const formData = new FormData();
        formData.set('requestId', selected.id);
        formData.set('content', message);
        formData.set('file', file);
        res = await fetch('/api/student-chat/messages', { method: 'POST', body: formData });
      } else {
        res = await fetch('/api/student-chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: selected.id, content: message }),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'The message could not be sent.');
      upsertMessage(json.message);
      setMessage('');
      if (json.moderation?.alert) {
        setModerationAlert(json.moderation.alert);
        if (json.moderation.action === 'blocked') await loadRequests();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-accent/8 to-secondary/10 shadow-lg shadow-primary/5">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">Request-first safe chat</Badge>
              {canUseStudentChat && (
                <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Check className="h-3 w-3" /> Active
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Study Buddies 💬
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
              Send a request using the student&apos;s unique username or email. Chat opens after approval; messaging is a
              Pro or Elite feature. Keep it study-focused!
            </p>
          </div>
          {!canUseStudentChat && (
            <Button asChild variant="gradient" className="shrink-0 shadow-md shadow-primary/20">
              <Link href="/subscription">
                <Crown className="mr-2 h-4 w-4" /> Unlock Chat
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Buddy list on the right, chat thread on the left */}
      <div className="grid gap-6 xl:grid-cols-[1fr,360px]">
        <div className="space-y-4 xl:order-2">
          {/* Send Request Card */}
          <Card className="border-primary/15 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                Find a Study Buddy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="@student_username or email"
                className="h-10 text-sm"
              />
              <p className="text-muted-foreground/80 text-xs">Usernames are unique; the @ symbol is optional.</p>
              <Button variant="gradient" onClick={sendRequest} loading={sending} className="w-full h-10">
                <Send className="mr-2 h-4 w-4" /> Send Request
              </Button>
            </CardContent>
          </Card>

          {/* Incoming Requests */}
          {incoming.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                  </span>
                  Incoming Requests ({incoming.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {incoming.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    currentUserId={user?.id}
                    actions={
                      <div className="flex gap-1.5">
                        <Button size="icon-sm" variant="outline" onClick={() => updateRequest(request.id, 'approved')} className="border-green-200 hover:bg-green-50 hover:text-green-600 dark:border-green-800 dark:hover:bg-green-950">
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button size="icon-sm" variant="outline" onClick={() => updateRequest(request.id, 'declined')} className="border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-950">
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    }
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Approved Chats */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-4 w-4 text-primary" />
                Approved Chats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && (
                <div className="flex items-center gap-2 py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <span className="text-muted-foreground text-sm">Loading buddies...</span>
                </div>
              )}
              {!loading && approved.length === 0 && (
                <div className="py-6 text-center">
                  <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">No approved buddies yet</p>
                  <p className="text-muted-foreground/70 mt-1 text-xs">Send a request above to get started!</p>
                </div>
              )}
              {approved.map((request) => {
                const buddy = request.requester_id === user?.id ? request.recipient : request.requester;
                const initials = buddy?.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || '?';
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedId(request.id)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200',
                      selected?.id === request.id
                        ? 'border-primary/40 bg-primary/10 shadow-sm'
                        : 'border-border/60 bg-card hover:border-primary/20 hover:bg-muted/30'
                    )}
                  >
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                      selected?.id === request.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                    )}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{buddy?.full_name || 'Student'}</p>
                      <p className="text-muted-foreground/80 truncate text-xs">
                        {buddy?.username ? `@${buddy.username}` : buddy?.email}
                      </p>
                    </div>
                    {selected?.id === request.id && (
                      <div className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse"></div>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Pending Sent */}
          {outgoing.length > 0 && (
            <Card className="border-dashed shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400"></span>
                  </span>
                  Pending Sent ({outgoing.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outgoing.map((request) => (
                  <RequestRow key={request.id} request={request} currentUserId={user?.id} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Thread */}
        <Card className="border-primary/15 bg-card/95 shadow-xl shadow-black/5 xl:order-1">
          <CardHeader className="border-border/70 bg-gradient-to-r from-muted/30 to-muted/10 flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                {selectedBuddy ? selectedBuddy.full_name : 'Select a buddy'}
              </CardTitle>
              {selectedBuddy && (
                <p className="text-muted-foreground/80 text-xs mt-0.5">
                  {selectedBuddy.username ? `@${selectedBuddy.username}` : selectedBuddy.email}
                </p>
              )}
            </div>
            {selected && (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => deleteChat(selected.id)}
                aria-label="Delete chat"
                title="Delete chat"
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex h-[500px] flex-col p-0">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/5">
                  <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="font-semibold text-foreground">Select an approved chat</p>
                <p className="text-muted-foreground/70 mt-2 max-w-sm text-sm">
                  A conversation will start here after the request is approved.
                </p>
              </div>
            ) : (
              <>
                {/* Moderation Alert */}
                {(moderationAlert || selectedBlockedUntil) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-b border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200"
                  >
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        {selectedBlockedUntil
                          ? `This chat is blocked until ${new Date(selectedBlockedUntil).toLocaleString()} because it moved off study topics.`
                          : moderationAlert}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Messages Area */}
                <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_40%),linear-gradient(180deg,hsl(var(--muted)/0.2),transparent)] p-4">
                  {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <p className="text-muted-foreground/60 text-sm">No messages yet. Say hello! 👋</p>
                    </div>
                  )}
                  {messages.map((item, index) => {
                    const mine = item.sender_id === user?.id;
                    const showAvatar = index === 0 || messages[index - 1]?.sender_id !== item.sender_id;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                      >
                        <div className={cn('max-w-[80%] sm:max-w-[75%] group/message')}>
                          {showAvatar && !mine && (
                            <div className="mb-1 ml-1 flex items-center gap-1.5">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                                {(item.sender_id === selectedBuddy?.id ? selectedBuddy.full_name : 'You').charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}
                          <div
                            className={cn(
                              'rounded-2xl border px-3.5 py-2.5 text-sm shadow-sm transition-shadow group-hover/message:shadow-md',
                              mine
                                ? 'border-primary/20 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-primary/10 rounded-br-sm'
                                : 'border-border/60 bg-background/95 text-foreground shadow-sm rounded-bl-sm'
                            )}
                          >
                            {item.content && <p className="leading-relaxed whitespace-pre-wrap">{item.content}</p>}
                            <ChatAttachmentBubble message={item} mine={mine} />
                            <div
                              className={cn(
                                'mt-1.5 flex items-center gap-1.5 text-[11px] font-medium',
                                mine ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground/70 justify-start'
                              )}
                            >
                              <span>{formatMessageTime(item.created_at)}</span>
                              {mine && (
                                <>
                                  {item.read_at ? (
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  <span>{item.read_at ? 'Seen' : 'Sent'}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                </div>

                {/* Input Area */}
                {!canUseStudentChat ? (
                  <div className="border-border border-t p-4">
                    <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-5 text-center">
                      <LockKeyhole className="text-primary mx-auto mb-3 h-6 w-6" />
                      <p className="font-semibold text-foreground">Messaging is a Pro or Elite feature</p>
                      <p className="text-muted-foreground/80 mt-1 text-xs">
                        Free users can send and accept requests. Upgrade to unlock real-time chat.
                      </p>
                      <Button asChild variant="gradient" size="sm" className="mt-4 shadow-md">
                        <Link href="/subscription">Unlock Chat</Link>
                      </Button>
                    </div>
                  </div>
                ) : selectedBlockedUntil ? (
                  <div className="border-border border-t p-4">
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-center text-sm text-amber-700 dark:text-amber-200">
                      <AlertTriangle className="mx-auto mb-2 h-5 w-5" />
                      Chat is temporarily blocked. Wait for the block to expire before sending study-related messages.
                    </div>
                  </div>
                ) : (
                  <div className="border-border bg-background/95 flex flex-col gap-2 border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
                    {!isOnline && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 rounded-lg border border-amber-200/50 bg-amber-50/80 px-3 py-1.5 text-xs text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/50 dark:text-amber-300"
                      >
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"></div>
                        Offline — messages queued locally
                      </motion.div>
                    )}
                    <div className="flex items-center gap-2">
                      <EmojiPickerButton onSelect={(emoji) => setMessage((current) => current + emoji)} disabled={!isOnline} />
                      <ChatAttachmentButton onSelect={(file) => sendMessage(file)} disabled={!isOnline || sending} />
                      <Input
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={isOnline ? 'Type your message...' : 'Connect to send...'}
                        disabled={!isOnline}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') sendMessage();
                        }}
                        className="flex-1 min-w-0 h-10"
                      />
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => sendMessage()}
                        loading={sending}
                        disabled={!isOnline}
                        aria-label="Send message"
                        className="h-10 w-10"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
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
