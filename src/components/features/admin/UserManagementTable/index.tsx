'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Crown, RotateCcw, Infinity as InfinityIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string;
  username: string | null;
  sponsored_institution_name: string | null;
  sponsored_institution_type: 'school' | 'college' | null;
  subscription_tier: 'FREE' | 'PRO' | 'ELITE';
  subscription_expires_at: string | null;
  xp: number;
  created_at: string;
}

type SubscriptionTier = AdminUser['subscription_tier'];
type ManualSubscriptionDuration = 'monthly' | 'yearly' | 'lifetime';
type InstitutionType = 'school' | 'college';
type GrantSelection = {
  tier: SubscriptionTier;
  duration: ManualSubscriptionDuration;
  institutionType: InstitutionType;
  institutionName: string;
};

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
  const [grantSelections, setGrantSelections] = useState<Record<string, GrantSelection>>({});

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setUsers(json.users || []);
    } catch {
      toast.error('Users could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);
  useEffect(() => {
    const timer = setTimeout(() => load(query), 350);
    return () => clearTimeout(timer);
  }, [query, load]);

  const grant = async (user: AdminUser, selection: GrantSelection) => {
    if (selection.tier !== 'FREE' && !selection.institutionName.trim()) {
      toast.error('A school or college name is required for a paid plan.');
      return;
    }
    const actionId = `${user.id}:${selection.tier}:${selection.duration}`;
    setActingOn(actionId);
    try {
      const res = await fetch('/api/admin/grant-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tier: selection.tier,
          duration: selection.duration,
          sponsoredInstitutionName: selection.institutionName,
          sponsoredInstitutionType: selection.institutionType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'The update failed.');
      toast.success(
        selection.tier === 'FREE'
          ? 'The user was moved back to the Free plan.'
          : `${selection.tier} access granted for ${DURATION_LABELS[selection.duration]}`
      );
      await load(query);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The update failed.');
    } finally {
      setActingOn(null);
    }
  };

  const isActing = (userId: string, tier: SubscriptionTier, duration: ManualSubscriptionDuration) =>
    actingOn === `${userId}:${tier}:${duration}`;

  const getSelection = (user: AdminUser): GrantSelection =>
    grantSelections[user.id] || {
      tier: user.subscription_tier === 'FREE' ? 'PRO' : user.subscription_tier,
      duration: user.subscription_tier !== 'FREE' && user.subscription_expires_at === null ? 'lifetime' : 'monthly',
      institutionType: user.sponsored_institution_type || 'college',
      institutionName: user.sponsored_institution_name || '',
    };

  const updateSelection = (userId: string, next: Partial<GrantSelection>) => {
    setGrantSelections((current) => {
      const existing = current[userId] || {
        tier: 'PRO' as SubscriptionTier,
        duration: 'monthly' as ManualSubscriptionDuration,
        institutionType: 'college' as InstitutionType,
        institutionName: '',
      };
      const merged = { ...existing, ...next };
      return { ...current, [userId]: { ...merged, duration: merged.tier === 'FREE' ? 'lifetime' : merged.duration } };
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by username, email, name, or school..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="p-4">Username</th>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Sponsor</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Expires</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground p-6 text-center">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground p-6 text-center">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const selection = getSelection(user);
                  return (
                    <tr key={user.id} className="border-border/50 border-b align-top">
                      <td className="p-4 font-medium">{user.username ? `@${user.username}` : 'Not set'}</td>
                      <td className="p-4">{user.full_name || '—'}</td>
                      <td className="text-muted-foreground p-4">{user.email}</td>
                      <td className="text-muted-foreground p-4 text-xs">
                        {user.sponsored_institution_name
                          ? `${user.sponsored_institution_name} (${user.sponsored_institution_type || 'institution'})`
                          : 'Not assigned'}
                      </td>
                      <td className="p-4">
                        <Badge variant={user.subscription_tier === 'FREE' ? 'outline' : 'success'}>
                          {user.subscription_tier}
                          {user.subscription_tier !== 'FREE' && user.subscription_expires_at === null && (
                            <InfinityIcon className="ml-1 inline h-3 w-3" />
                          )}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground p-4 text-xs">
                        {user.subscription_expires_at
                          ? new Date(user.subscription_expires_at).toLocaleDateString()
                          : user.subscription_tier === 'FREE'
                            ? '—'
                            : 'Lifetime'}
                      </td>
                      <td className="p-4">
                        <div className="grid min-w-[720px] gap-2 lg:grid-cols-[130px,150px,130px,220px,auto]">
                          <Select
                            value={selection.tier}
                            onValueChange={(value) => updateSelection(user.id, { tier: value as SubscriptionTier })}
                          >
                            <SelectTrigger aria-label={`Plan for ${user.email}`}>
                              <SelectValue placeholder="Plan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PRO">Pro</SelectItem>
                              <SelectItem value="ELITE">Elite</SelectItem>
                              <SelectItem value="FREE">Free</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={selection.duration}
                            disabled={selection.tier === 'FREE'}
                            onValueChange={(value) =>
                              updateSelection(user.id, { duration: value as ManualSubscriptionDuration })
                            }
                          >
                            <SelectTrigger aria-label={`Duration for ${user.email}`}>
                              <SelectValue placeholder="Duration" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">1 Month</SelectItem>
                              <SelectItem value="yearly">1 Year</SelectItem>
                              <SelectItem value="lifetime">Lifetime</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={selection.institutionType}
                            disabled={selection.tier === 'FREE'}
                            onValueChange={(value) =>
                              updateSelection(user.id, { institutionType: value as InstitutionType })
                            }
                          >
                            <SelectTrigger aria-label={`Institution type for ${user.email}`}>
                              <SelectValue placeholder="Source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="school">School</SelectItem>
                              <SelectItem value="college">College</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={selection.institutionName}
                            disabled={selection.tier === 'FREE'}
                            onChange={(event) => updateSelection(user.id, { institutionName: event.target.value })}
                            placeholder="School / college name"
                            aria-label={`Institution name for ${user.email}`}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={selection.tier === 'FREE' ? 'outline' : 'gradient'}
                              loading={isActing(user.id, selection.tier, selection.duration)}
                              onClick={() => grant(user, selection)}
                            >
                              <Crown className="h-3.5 w-3.5" /> Apply
                            </Button>
                            {user.subscription_tier !== 'FREE' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                loading={isActing(user.id, 'FREE', 'lifetime')}
                                onClick={() => grant(user, { ...selection, tier: 'FREE', duration: 'lifetime' })}
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Free
                              </Button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
