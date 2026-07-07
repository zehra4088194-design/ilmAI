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

  const grant = async (userId: string, tier: 'FREE' | 'PRO' | 'ELITE', lifetime = false) => {
    setActingOn(userId);
    try {
      const res = await fetch('/api/admin/grant-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tier, lifetime }),
      });
      if (!res.ok) throw new Error();
      toast.success(tier === 'FREE' ? 'User Free plan par revert ho gaya' : `User ko ${tier}${lifetime ? ' (lifetime)' : ''} mil gaya`);
      load(query);
    } catch {
      toast.error('Update fail ho gaya');
    } finally {
      setActingOn(null);
    }
  };

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
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={actingOn === u.id}
                          onClick={() => grant(u.id, 'PRO', true)}
                        >
                          <Crown className="w-3.5 h-3.5" /> Pro (Lifetime)
                        </Button>
                        <Button
                          size="sm"
                          variant="gradient"
                          loading={actingOn === u.id}
                          onClick={() => grant(u.id, 'ELITE', true)}
                        >
                          <Crown className="w-3.5 h-3.5" /> Elite (Lifetime)
                        </Button>
                        {u.subscription_tier !== 'FREE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={actingOn === u.id}
                            onClick={() => grant(u.id, 'FREE')}
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
