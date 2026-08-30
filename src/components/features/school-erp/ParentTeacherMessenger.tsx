'use client';

import { useState } from 'react';
import { MessageCircle, User } from 'lucide-react';
import { DirectMessageThread } from '@/components/ui/DirectMessageThread';

type Contact = { profileId: string; fullName: string; avatarUrl?: string | null; context?: string };

/**
 * Phase 2c — parent<->teacher messaging UI on top of the Phase 1a direct_conversations
 * infrastructure. Same component renders on all four sides (school-admin/communication and
 * /school for the school portal, college-admin/communication and /college for the college
 * portal) — only `contacts`/`contextType` differ per caller.
 */
export function ParentTeacherMessenger({
  contacts,
  organizationId,
  currentUserId,
  contextType = 'school',
}: {
  contacts: Contact[];
  organizationId: string;
  currentUserId: string;
  contextType?: 'school' | 'college';
}) {
  const [selected, setSelected] = useState<Contact | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openConversation = async (contact: Contact) => {
    setSelected(contact);
    setConversationId(null);
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextType,
          organizationId,
          relationshipType: 'parent_teacher',
          otherProfileId: contact.profileId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'The conversation could not be started.');
      setConversationId(json.conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The conversation could not be started.');
    } finally {
      setLoading(false);
    }
  };

  if (!contacts.length) {
    return <p className="text-muted-foreground text-sm">No contacts are available to message yet.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="space-y-1">
        {contacts.map((contact) => (
          <button
            key={contact.profileId}
            type="button"
            onClick={() => openConversation(contact)}
            className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-left text-sm transition ${
              selected?.profileId === contact.profileId ? 'bg-muted' : 'hover:bg-muted/60'
            }`}
          >
            <span className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
              {contact.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={contact.avatarUrl} alt={contact.fullName} className="h-full w-full object-cover" />
              ) : (
                <User className="text-muted-foreground h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{contact.fullName || 'Contact'}</span>
              {contact.context && <span className="text-muted-foreground block truncate text-[11px]">{contact.context}</span>}
            </span>
          </button>
        ))}
      </div>
      <div>
        {!selected && (
          <p className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm">
            <MessageCircle className="h-4 w-4" /> Select someone to start messaging.
          </p>
        )}
        {selected && loading && <p className="text-muted-foreground p-6 text-center text-sm">Opening conversation...</p>}
        {selected && error && <p className="text-destructive p-6 text-center text-sm">{error}</p>}
        {selected && conversationId && !loading && (
          <DirectMessageThread conversationId={conversationId} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}
