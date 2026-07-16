'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/data/useNotifications';
import { cn } from '@/lib/utils/cn';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: notifications, unreadCount, markAsRead, isLoading } = useNotifications();

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

          {isLoading && <p className="px-4 py-6 text-sm text-muted-foreground text-center">Load ho raha hai...</p>}

          {!isLoading && (!notifications || notifications.length === 0) && (
            <div className="px-4 py-7 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold">No notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">Study routine, messages, requests aur progress alerts yahin aayenge.</p>
            </div>
          )}

          {(notifications || []).map((n) => {
            const body = (
              <div
                onClick={() => {
                  if (!n.isRead) markAsRead(n.id);
                  setOpen(false);
                }}
                className={cn(
                  'px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-accent transition-colors',
                  !n.isRead && 'bg-violet-500/5'
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link}>
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
