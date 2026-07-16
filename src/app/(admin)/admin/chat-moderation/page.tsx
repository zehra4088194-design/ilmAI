import { Metadata } from 'next';
import { MessageCircleWarning, ShieldCheck } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { unblockStudentChat } from './actions';

export const metadata: Metadata = { title: 'Admin - Chat Blocks' };

type ProfileLite = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type BlockedChat = {
  id: string;
  requester_id: string;
  recipient_id: string;
  moderation_warning_count: number | null;
  moderation_blocked_until: string | null;
  moderation_last_reason: string | null;
  updated_at: string;
};

export default async function ChatModerationPage() {
  const admin = await createAdminClient() as any;
  const now = new Date().toISOString();
  const { data: blockedChats, error } = await admin
    .from('student_chat_requests')
    .select('id, requester_id, recipient_id, moderation_warning_count, moderation_blocked_until, moderation_last_reason, updated_at')
    .gt('moderation_blocked_until', now)
    .order('moderation_blocked_until', { ascending: true });

  const chats = (blockedChats || []) as BlockedChat[];
  const profileIds = Array.from(new Set(chats.flatMap((chat) => [chat.requester_id, chat.recipient_id])));
  const { data: profiles } = profileIds.length
    ? await admin.from('profiles').select('id, full_name, email').in('id', profileIds)
    : { data: [] };
  const profileMap = new Map<string, ProfileLite>((profiles || []).map((profile: ProfileLite) => [profile.id, profile]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chat Blocks</h1>
        <p className="text-sm text-muted-foreground">
          Student-to-student chats jo study se hatne ki wajah se temporarily block hui hain. 2 din baad auto expire ho jaati hain, ya admin yahan se unblock kar sakta hai.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
              <MessageCircleWarning className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active blocks</p>
              <p className="text-2xl font-bold">{chats.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Moderation rule</p>
              <p className="text-sm text-muted-foreground">
                Har 50 combined messages ke baad AI conversation classify karta hai. Pehli off-topic detection par warning, doosri par 2 din ka block.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Blocked conversations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">Blocked chats load nahi hue: {error.message}</p>}
          {!error && chats.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
              <p className="font-semibold">Abhi koi active chat block nahi hai</p>
              <p className="mt-1 text-sm text-muted-foreground">Off-topic repeated chats yahan automatically aa jaayengi.</p>
            </div>
          )}
          {chats.map((chat) => {
            const requester = profileMap.get(chat.requester_id);
            const recipient = profileMap.get(chat.recipient_id);
            return (
              <div key={chat.id} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="destructive">Blocked</Badge>
                      <Badge variant="outline">{chat.moderation_warning_count || 0} warnings</Badge>
                      <span className="text-xs text-muted-foreground">Until {new Date(chat.moderation_blocked_until || '').toLocaleString('en-PK')}</span>
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <StudentMini label="Student A" profile={requester} fallback={chat.requester_id} />
                      <StudentMini label="Student B" profile={recipient} fallback={chat.recipient_id} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Reason:</span> {chat.moderation_last_reason || 'No reason saved'}
                    </p>
                  </div>
                  <form action={unblockStudentChat}>
                    <input type="hidden" name="request_id" value={chat.id} />
                    <Button type="submit" variant="outline" size="sm">Unblock now</Button>
                  </form>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentMini({ label, profile, fallback }: { label: string; profile?: ProfileLite; fallback: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium">{profile?.full_name || 'Student'}</p>
      <p className="truncate text-xs text-muted-foreground">{profile?.email || fallback}</p>
    </div>
  );
}
