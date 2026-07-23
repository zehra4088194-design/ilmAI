import { describe, expect, it } from 'vitest';
import { decodeChatArchive, encodeChatArchive, mergeChatMessages } from './chat-archive';

describe('chat archives', () => {
  it('round-trips compressed chat data', () => {
    const payload = {
      version: 1 as const,
      type: 'student' as const,
      conversationId: 'request-1',
      archivedAt: '2026-07-23T00:00:00.000Z',
      messages: [{ id: 'm1', created_at: '2026-07-20T00:00:00.000Z', content: 'Hello' }],
    };

    expect(decodeChatArchive(encodeChatArchive(payload))).toEqual(payload);
  });

  it('merges archived and live messages without duplicates', () => {
    const archived = [
      { id: 'm1', created_at: '2026-07-20T00:00:00.000Z' },
      { id: 'm2', created_at: '2026-07-21T00:00:00.000Z' },
    ];
    const live = [
      { id: 'm2', created_at: '2026-07-21T00:00:00.000Z' },
      { id: 'm3', created_at: '2026-07-22T00:00:00.000Z' },
    ];

    expect(mergeChatMessages(archived, live).map((message) => message.id)).toEqual(['m1', 'm2', 'm3']);
  });
});
