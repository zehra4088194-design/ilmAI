'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import Link from 'next/link';
import { Check, Crown, LockKeyhole, MessageCircle, Send, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

type StudentProfile = {
  id: string;
  full_name: string;
  email: string;
  subscription_tier: 'FREE' | 'PRO' | 'ELITE';
  grade_level?: string | null;
  board?: string | null;
};

type ChatRequest = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  requester: StudentProfile | null;
  recipient: StudentProfile | null;
};

type ChatMessage = {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export function StudentChatClient() {
  const { user } = useAuth();
  const settings = usePlatformSettings();
  const [email, setEmail] = useState('');
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student-chat/requests');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Requests load nahi hui');
      setRequests(json.requests || []);
      if (!selectedId && json.requests?.some((request: ChatRequest) => request.status === 'approved')) {
        setSelectedId(json.requests.find((request: ChatRequest) => request.status === 'approved')?.id || null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Requests load nahi hui');
    } finally {
      setLoading(false);
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

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (!selected?.id) {
      setMessages([]);
      return;
    }
    loadMessages(selected.id);
    const timer = window.setInterval(() => loadMessages(selected.id), 10000);
    return () => window.clearInterval(timer);
  }, [selected?.id]);

  const sendRequest = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/student-chat/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request send nahi hui');
      setEmail('');
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
      setMessages((items) => [...items, json.message]);
      setMessage('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Message send nahi hua');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-card to-indigo-500/10">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="mb-2 bg-violet-600">Request-first safe chat</Badge>
            <h1 className="text-2xl font-bold">Study Buddies</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pehle student email se request bhejo. Approval ke baad chat open hogi; messaging Pro/Elite feature hai.
            </p>
          </div>
          {!canUseStudentChat && (
            <Button asChild variant="gradient" className="shrink-0">
              <Link href="/subscription"><Crown className="h-4 w-4" /> Pro to unlock chat</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-violet-400" /> Send Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@email.com" type="email" />
              <Button variant="gradient" onClick={sendRequest} loading={sending} className="w-full">
                <Send className="h-4 w-4" /> Send study request
              </Button>
            </CardContent>
          </Card>

          {incoming.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Incoming Requests</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {incoming.map((request) => (
                  <RequestRow key={request.id} request={request} currentUserId={user?.id} actions={
                    <div className="flex gap-2">
                      <Button size="icon-sm" variant="outline" onClick={() => updateRequest(request.id, 'approved')}><Check className="h-4 w-4 text-green-500" /></Button>
                      <Button size="icon-sm" variant="outline" onClick={() => updateRequest(request.id, 'declined')}><X className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  } />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Approved Chats</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
              {!loading && approved.length === 0 && <p className="text-sm text-muted-foreground">Abhi koi approved buddy nahi.</p>}
              {approved.map((request) => {
                const buddy = request.requester_id === user?.id ? request.recipient : request.requester;
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedId(request.id)}
                    className={cn('w-full rounded-xl border px-3 py-2 text-left transition-colors', selected?.id === request.id ? 'border-violet-500/50 bg-violet-500/10' : 'border-border bg-muted/20 hover:bg-muted/40')}
                  >
                    <p className="text-sm font-semibold">{buddy?.full_name || 'Student'}</p>
                    <p className="text-xs text-muted-foreground">{buddy?.email}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {outgoing.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Pending Sent</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {outgoing.map((request) => <RequestRow key={request.id} request={request} currentUserId={user?.id} />)}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="min-h-[560px]">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-violet-400" />
              {selectedBuddy ? selectedBuddy.full_name : 'Select a buddy'}
            </CardTitle>
            {selectedBuddy && <p className="text-xs text-muted-foreground">{selectedBuddy.email}</p>}
          </CardHeader>
          <CardContent className="flex h-[500px] flex-col p-0">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">Approved chat select karo</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Request approve hone ke baad yahan conversation start hogi.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet.</p>}
                  {messages.map((item) => {
                    const mine = item.sender_id === user?.id;
                    return (
                      <div key={item.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div className={cn('max-w-[78%] rounded-2xl px-3 py-2 text-sm', mine ? 'bg-violet-600 text-white' : 'bg-muted')}>
                          {item.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!canUseStudentChat ? (
                  <div className="border-t border-border p-4">
                    <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center">
                      <LockKeyhole className="mx-auto mb-2 h-5 w-5 text-violet-400" />
                      <p className="font-semibold">Messaging Pro/Elite feature hai</p>
                      <p className="mt-1 text-xs text-muted-foreground">Free users request bhej aur accept kar sakte hain. Actual chat unlock karne ke liye Pro lo.</p>
                      <Button asChild variant="gradient" size="sm" className="mt-3">
                        <Link href="/subscription">Pro to unlock chat</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 border-t border-border p-4">
                    <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type your message..." onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} />
                    <Button variant="gradient" onClick={sendMessage} loading={sending}><Send className="h-4 w-4" /></Button>
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

function RequestRow({ request, currentUserId, actions }: { request: ChatRequest; currentUserId?: string; actions?: React.ReactNode }) {
  const buddy = request.requester_id === currentUserId ? request.recipient : request.requester;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{buddy?.full_name || 'Student'}</p>
        <p className="truncate text-xs text-muted-foreground">{buddy?.email}</p>
      </div>
      {actions || <Badge variant="outline">Pending</Badge>}
    </div>
  );
}
