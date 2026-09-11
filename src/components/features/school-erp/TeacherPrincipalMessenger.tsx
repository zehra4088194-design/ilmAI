'use client';

import { useState } from 'react';
import { MessageCircle, User } from 'lucide-react';
import { DirectMessageThread } from '@/components/ui/DirectMessageThread';

type Contact = { profileId: string; fullName: string; avatarUrl?: string | null; context?: string };

/**
 * Teacher ↔ Principal 1-on-1 real-time chat UI.
 * Reuses the same direct_conversations/direct_messages infrastructure as parent_teacher messaging.
 */
export function TeacherPrincipalMessenger({
  contacts,
  organizationId,
  currentUserId,
}: {
  contacts: Contact[];
  organizationId: string;
  currentUserId: string;
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
          contextType: 'school',
          organizationId,
          relationshipType: 'teacher_principal',
          otherProfileId: contact.profileId,
        }),
      });
      const json = await res.json();

      if (!res.ok || json.error) throw new Error(json.error || 'Could not start conversation');
      setConversationId(json.conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageCircle className="h-4 w-4" />
        <span>Message the Principal</span>
      </div>

      {contacts.length === 0 && (
        <p className="text-muted-foreground text-sm">No principal found in your organization.</p>
      )}

      {contacts.map((contact) => (
        <button
          key={contact.profileId}
          onClick={() => openConversation(contact)}
          disabled={loading}
          className="flex w-full items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/50"
        >
          <User className="h-8 w-8 text-muted-foreground" />
          <div className="text-left">
            <p className="text-sm font-medium">{contact.fullName}</p>
            <p className="text-muted-foreground text-xs">Click to start chatting</p>
          </div>
        </button>
      ))}

      {error && <p className="text-destructive text-sm">{error}</p>}

      {conversationId && (
        <DirectMessageThread
          conversationId={conversationId}
          currentUserId={currentUserId}
          onDeleted={() => {
            setConversationId(null);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
