'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Reply, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { ProtectedResourceKind } from '@/lib/resources/server';

type ResourceComment = {
  id: string;
  resource_kind: ProtectedResourceKind;
  resource_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

function authorName(comment: ResourceComment) {
  return comment.profiles?.full_name || 'ilm AI user';
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(
    new Date(value)
  );
}

export function ResourceComments({
  resourceKind,
  resourceId,
}: {
  resourceKind: ProtectedResourceKind;
  resourceId: string;
}) {
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<ResourceComment | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const loadComments = useCallback(async () => {
    const params = new URLSearchParams({ resourceKind, resourceId });
    const response = await fetch(`/api/resources/comments?${params.toString()}`);
    const payload = (await response.json().catch(() => ({}))) as { comments?: ResourceComment[]; error?: string };
    if (!response.ok) throw new Error(payload.error || 'Comments could not be loaded.');
    setComments(payload.comments || []);
  }, [resourceId, resourceKind]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadComments()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setSignedIn(Boolean(data.user));
    });
    const channel = supabase
      .channel(`resource-comments:${resourceKind}:${resourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_comments',
          filter: `resource_id=eq.${resourceId}`,
        },
        () => void loadComments().catch(() => undefined)
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [loadComments, resourceId, resourceKind]);

  const grouped = useMemo(() => {
    const roots = comments.filter((comment) => !comment.parent_id);
    const replies = new Map<string, ResourceComment[]>();
    comments
      .filter((comment) => comment.parent_id)
      .forEach((comment) => {
        const key = comment.parent_id!;
        replies.set(key, [...(replies.get(key) || []), comment]);
      });
    return { roots, replies };
  }, [comments]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const response = await fetch('/api/resources/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceKind, resourceId, parentId: replyTo?.id || null, body }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Comment could not be posted.');
      setBody('');
      setReplyTo(null);
      await loadComments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Comment could not be posted.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <aside className="bg-background border-border flex h-full min-h-0 flex-col border-t lg:border-t-0 lg:border-l">
      <div className="border-border border-b p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-primary h-4 w-4" />
          <h2 className="text-sm font-semibold">Comments and suggestions</h2>
        </div>
        <p className="text-muted-foreground mt-2 text-xs leading-5">
          Inform us if there is any error or suggestion. Your opinion matters to us.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {loading && <p className="text-muted-foreground text-sm">Loading comments...</p>}
        {!loading && grouped.roots.length === 0 && (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No comments yet. Be the first to report a correction or suggestion.
          </p>
        )}
        {grouped.roots.map((comment) => (
          <article key={comment.id} className="space-y-3 rounded-lg border p-3">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">{authorName(comment)}</p>
                <time className="text-muted-foreground shrink-0 text-[11px]">{timeLabel(comment.created_at)}</time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
              <Button type="button" variant="ghost" size="sm" className="mt-2 h-8 px-2" onClick={() => setReplyTo(comment)}>
                <Reply className="h-3.5 w-3.5" />
                Reply
              </Button>
            </div>
            {(grouped.replies.get(comment.id) || []).map((reply) => (
              <div key={reply.id} className="border-border ml-4 border-l pl-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-semibold">{authorName(reply)}</p>
                  <time className="text-muted-foreground shrink-0 text-[10px]">{timeLabel(reply.created_at)}</time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{reply.body}</p>
              </div>
            ))}
          </article>
        ))}
      </div>

      <form onSubmit={submit} className="border-border space-y-3 border-t p-4">
        {replyTo && (
          <div className="bg-muted flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs">
            <span className="truncate">Replying to {authorName(replyTo)}</span>
            <button type="button" className="font-semibold" onClick={() => setReplyTo(null)}>
              Cancel
            </button>
          </div>
        )}
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={signedIn ? 'Write a correction, suggestion, or reply...' : 'Sign in to comment or reply.'}
          disabled={!signedIn || posting}
          maxLength={1200}
          rows={3}
          className="border-input bg-background focus-visible:ring-ring w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-60"
        />
        <Button type="submit" size="sm" className="w-full" disabled={!signedIn || posting || body.trim().length < 2}>
          <Send className="h-3.5 w-3.5" />
          Post comment
        </Button>
      </form>
    </aside>
  );
}
