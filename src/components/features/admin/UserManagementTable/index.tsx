'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, Crown, RotateCcw, Infinity as InfinityIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string;
  subscription_tier: 'FREE' | 'PRO' | 'ELITE';
  subscription_expires_at: string | null;
  xp: number;
  created_at: string;
}

type SubscriptionTier = AdminUser['subscription_tier'];
type ManualSubscriptionDuration = 'monthly' | 'yearly' | 'lifetime';

const DURATION_LABELS: Record<ManualSubscriptionDuration, string> = {
  monthly: '1 Month',
  yearly: '1 Year',
  lifetime: 'Lifetime',
};

export function UserManagementTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setUsers(json.users || []);
    } catch {
      toast.error('Users load nahi ho sake');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(query), 350);
    return () => clearTimeout(t);
  }, [query, load]);

  const grant = async (userId: string, tier: SubscriptionTier, duration: ManualSubscriptionDuration = 'monthly') => {
    const actionId = `${userId}:${tier}:${duration}`;
    setActingOn(actionId);
    try {
      const res = await fetch('/api/admin/grant-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tier, duration }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update fail ho gaya');
      if (json.user) {
        setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...json.user } : user)));
      }
      toast.success(tier === 'FREE' ? 'User Free plan par revert ho gaya' : `User ko ${tier} ${DURATION_LABELS[duration]} mil gaya`);
      await load(query);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update fail ho gaya');
    } finally {
      setActingOn(null);
    }
  };

  const isActing = (userId: string, tier: SubscriptionTier, duration: ManualSubscriptionDuration = 'monthly') => actingOn === `${userId}:${tier}:${duration}`;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Email ya naam se search karo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Expires</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Koi user nahi mila
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="p-4">{u.full_name || '—'}</td>
                    <td className="p-4 text-muted-foreground">{u.email}</td>
                    <td className="p-4">
                      <Badge variant={u.subscription_tier === 'FREE' ? 'outline' : 'success'}>
                        {u.subscription_tier}
                        {u.subscription_tier !== 'FREE' && u.subscription_expires_at === null && (
                          <InfinityIcon className="w-3 h-3 ml-1 inline" />
                        )}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {u.subscription_expires_at
                        ? new Date(u.subscription_expires_at).toLocaleDateString()
                        : u.subscription_tier === 'FREE'
                          ? '—'
                          : 'Lifetime'}
                    </td>
                    <td className="p-4">
                      <div className="flex min-w-[360px] flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {(['monthly', 'yearly', 'lifetime'] as ManualSubscriptionDuration[]).map((duration) => (
                            <Button
                              key={`pro-${duration}`}
                              size="sm"
                              variant="outline"
                              loading={isActing(u.id, 'PRO', duration)}
                              onClick={() => grant(u.id, 'PRO', duration)}
                            >
                              <Crown className="w-3.5 h-3.5" /> Pro {DURATION_LABELS[duration]}
                            </Button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(['monthly', 'yearly', 'lifetime'] as ManualSubscriptionDuration[]).map((duration) => (
                            <Button
                              key={`elite-${duration}`}
                              size="sm"
                              variant={duration === 'lifetime' ? 'gradient' : 'outline'}
                              loading={isActing(u.id, 'ELITE', duration)}
                              onClick={() => grant(u.id, 'ELITE', duration)}
                            >
                              <Crown className="w-3.5 h-3.5" /> Elite {DURATION_LABELS[duration]}
                            </Button>
                          ))}
                        </div>
                        {u.subscription_tier !== 'FREE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-fit"
                            loading={isActing(u.id, 'FREE', 'lifetime')}
                            onClick={() => grant(u.id, 'FREE', 'lifetime')}
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Revert to Free
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
