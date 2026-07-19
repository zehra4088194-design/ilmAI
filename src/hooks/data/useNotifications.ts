'use client';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';
import { toast } from 'sonner';

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
        link: n.link || '/dashboard',
        isRead: n.is_read,
        createdAt: n.created_at,
      }));
    },
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = (query.data || []).filter((n) => !n.isRead).length;

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      queryClient.setQueryData<Notification[]>(['notifications'], (current = []) =>
        current.filter((notification) => notification.id !== id)
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
      toast.error('Notification dismiss nahi hui');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active || !user) return;
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            if (payload.eventType !== 'INSERT') return;

            const notification = payload.new as {
              title?: string | null;
              message?: string | null;
              link?: string | null;
            };
            const title = notification.title || 'New notification';
            toast.info(title, {
              description: notification.message || undefined,
              action: notification.link
                ? {
                    label: 'Open',
                    onClick: () => {
                      window.location.href = notification.link || '/dashboard';
                    },
                  }
                : undefined,
            });

            if ('Notification' in window && window.Notification.permission === 'granted') {
              const browserNotification = new window.Notification(title, {
                body: notification.message || undefined,
              });
              browserNotification.onclick = () => {
                window.focus();
                window.location.href = notification.link || '/dashboard';
                browserNotification.close();
              };
            }
          }
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  return {
    ...query,
    unreadCount,
    markAsRead: markAsReadMutation.mutate,
    dismiss: dismissMutation.mutate,
  };
}
