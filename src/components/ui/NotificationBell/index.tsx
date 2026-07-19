'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/data/useNotifications';
import { cn } from '@/lib/utils/cn';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: notifications, unreadCount, markAsRead, dismiss, isLoading } = useNotifications();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant={open ? 'outline' : 'ghost'}
        size="icon"
        className="relative shrink-0"
        onClick={() => {
          setOpen((o) => !o);
          if ('Notification' in window && window.Notification.permission === 'default') {
            window.Notification.requestPermission().catch(() => {});
          }
        }}
        aria-label="Open notifications"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-[220] mt-2 w-[min(22rem,calc(100vw-1rem))] max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && <span className="text-xs text-muted-foreground">{unreadCount} nayi</span>}
          </div>

          {isLoading && <p className="px-4 py-6 text-sm text-muted-foreground text-center">Loading...</p>}

          {!isLoading && (!notifications || notifications.length === 0) && (
            <div className="px-4 py-7 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold">No notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">Study routine, messages, requests, and progress alerts will appear here.</p>
            </div>
          )}

          {(notifications || []).map((notification) => (
            <SwipeableNotification
              key={notification.id}
              notification={notification}
              markAsRead={markAsRead}
              dismiss={dismiss}
              close={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SwipeableNotification({
  notification,
  markAsRead,
  dismiss,
  close,
}: {
  notification: NonNullable<ReturnType<typeof useNotifications>['data']>[number];
  markAsRead: (id: string) => void;
  dismiss: (id: string) => void;
  close: () => void;
}) {
  const router = useRouter();
  const openDestination = () => {
    if (!notification.isRead) markAsRead(notification.id);
    close();
    router.push(notification.link || '/dashboard');
  };

  return (
    <div className="relative overflow-hidden border-b border-border last:border-0">
      <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-red-500 text-white">
        <Trash2 className="h-5 w-5" />
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -104, right: 0 }}
        dragElastic={0.08}
        onDragEnd={(_event, info) => {
          if (info.offset.x < -72 || info.velocity.x < -550) dismiss(notification.id);
        }}
        onClick={openDestination}
        role="link"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') openDestination();
        }}
        className={cn(
          'relative cursor-pointer bg-card px-4 py-3 transition-colors hover:bg-accent',
          !notification.isRead && 'bg-violet-500/5'
        )}
      >
        <div className="flex items-start gap-2">
          {!notification.isRead && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-500" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{notification.title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{notification.message}</p>
            <p className="text-muted-foreground mt-1 text-[10px]">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              <span className="ml-2 sm:hidden">Swipe left to dismiss</span>
            </p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              dismiss(notification.id);
            }}
            className="text-muted-foreground hover:text-destructive hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-destructive/10 sm:flex"
            aria-label="Dismiss notification"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
