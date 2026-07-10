'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';

export function useNotifications() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      // Hide legacy internal invite rows from the notification bell.
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .not('title', 'ilike', 'PARENT_INVITE:%')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      return (data || []).map((n) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type as Notification['type'],
        title: n.title,
        message: n.message,
        iconUrl: n.icon_url ?? undefined,
        link: n.link ?? undefined,
        isRead: n.is_read,
        createdAt: n.created_at,
      }));
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = (query.data || []).filter((n) => !n.isRead).length;

  return {
    ...query,
    unreadCount,
    markAsRead: markAsReadMutation.mutate,
  };
}
