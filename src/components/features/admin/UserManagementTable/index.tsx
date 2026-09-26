'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Crown, RotateCcw, X, UserRound } from 'lucide-react';
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
  role: string | null;
  institution_names: string[];
  institution_display: string;
  sponsored_institution_name: string | null;
  sponsored_institution_type: 'school' | 'college' | null;
  subscription_tier: 'FREE' | 'PRO' | 'ELITE';
  subscription_expires_at: string | null;
  subscription_started_at: string | null;
  subscription_status: 'free' | 'active' | 'expired';
  latest_subscription: {
    tier: 'FREE' | 'PRO' | 'ELITE';
    status: string;
    provider: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    provider_subscription_id: string | null;
  } | null;
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

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function UserManagementTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [grantSelections, setGrantSelections] = useState<Record<string, GrantSelection>>({});

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Users could not be loaded.');
      const nextUsers = (json.users || []) as AdminUser[];
      setUsers(nextUsers);
      setSelectedUser((current) => {
        if (!current) return current;
        return nextUsers.find((user) => user.id === current.id) || null;
      });
      return nextUsers;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Users could not be loaded.');
      return [] as AdminUser[];
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedUser(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      return {
        ...current,
        [userId]: {
          ...merged,
          duration: merged.tier === 'FREE' ? 'lifetime' : merged.duration,
        },
      };
    });
  };

  const activePaidCount = users.filter((user) => user.subscription_tier !== 'FREE').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-lg">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search name, email, username, school, or college..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-muted-foreground text-xs">
          {users.length} users · {activePaidCount} paid plans
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[minmax(0,1.5fr)_110px_150px_150px] border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[minmax(0,1.8fr)_120px_170px_170px]">
            <div>User</div>
            <div>Role</div>
            <div>Plan</div>
            <div>Signed up</div>
          </div>

          {loading ? (
            <div className="text-muted-foreground p-10 text-center text-sm">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">No users found.</div>
          ) : (
            <div>
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUser(user)}
                  className="grid w-full grid-cols-[minmax(0,1.5fr)_110px_150px_150px] items-center border-b border-border/60 px-4 py-3 text-left transition hover:bg-muted/40 sm:grid-cols-[minmax(0,1.8fr)_120px_170px_170px]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{user.full_name || 'Unnamed user'}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {user.email}
                        {user.username ? ` · @${user.username}` : ''}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Badge variant="outline" className="capitalize">
                      {user.role || 'unknown'}
                    </Badge>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={user.subscription_tier === 'FREE' ? 'outline' : 'success'}>
                        {user.subscription_tier}
                      </Badge>
                      {user.subscription_status === 'expired' && (
                        <span className="text-[11px] font-medium text-amber-500">Expired</span>
                      )}
                    </div>
                    {user.subscription_expires_at && (
                      <div className="mt-1 text-xs text-muted-foreground">Until {formatDate(user.subscription_expires_at)}</div>
                    )}
                    {user.subscription_tier !== 'FREE' && !user.subscription_expires_at && (
                      <div className="mt-1 text-xs text-muted-foreground">Lifetime</div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {formatDate(user.created_at)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close user details"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedUser(null)}
          />

          <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-background shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">User details</p>
                <h2 className="mt-1 truncate text-xl font-bold">{selectedUser.full_name || 'Unnamed user'}</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {selectedUser.email}
                  {selectedUser.username ? ` · @${selectedUser.username}` : ''}
                </p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Close" onClick={() => setSelectedUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Role" value={selectedUser.role || 'Unknown'} />
                <Info label="Signed up" value={formatDateTime(selectedUser.created_at)} />
                <Info label="Institution" value={selectedUser.institution_display} />
                <Info label="User ID" value={selectedUser.id} mono />
              </div>

              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current access</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={selectedUser.subscription_tier === 'FREE' ? 'outline' : 'success'}>
                          {selectedUser.subscription_tier}
                        </Badge>
                        {selectedUser.subscription_status === 'expired' && (
                          <Badge variant="outline">Expired</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>Started: {formatDate(selectedUser.subscription_started_at)}</div>
                      <div>Expires: {selectedUser.subscription_expires_at ? formatDateTime(selectedUser.subscription_expires_at) : selectedUser.subscription_tier === 'FREE' ? '—' : 'Lifetime'}</div>
                    </div>
                  </div>

                  {selectedUser.latest_subscription && (
                    <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                      Last subscription record: <span className="font-medium text-foreground">{selectedUser.latest_subscription.tier}</span>
                      {' · '}
                      {selectedUser.latest_subscription.status}
                      {selectedUser.latest_subscription.provider ? ` · ${selectedUser.latest_subscription.provider}` : ''}
                      {selectedUser.latest_subscription.current_period_end
                        ? ` · ended ${formatDate(selectedUser.latest_subscription.current_period_end)}`
                        : ''}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-5">
                  <div>
                    <h3 className="font-semibold">Set plan</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Choose the plan and duration, then apply it only when you're ready.</p>
                  </div>

                  {(() => {
                    const selection = getSelection(selectedUser);
                    return (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Select
                            value={selection.tier}
                            onValueChange={(value) => updateSelection(selectedUser.id, { tier: value as SubscriptionTier })}
                          >
                            <SelectTrigger aria-label="Plan">
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
                              updateSelection(selectedUser.id, { duration: value as ManualSubscriptionDuration })
                            }
                          >
                            <SelectTrigger aria-label="Duration">
                              <SelectValue placeholder="Duration" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">1 Month</SelectItem>
                              <SelectItem value="yearly">1 Year</SelectItem>
                              <SelectItem value="lifetime">Lifetime</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {selection.tier !== 'FREE' && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Select
                              value={selection.institutionType}
                              onValueChange={(value) => updateSelection(selectedUser.id, { institutionType: value as InstitutionType })}
                            >
                              <SelectTrigger aria-label="Sponsor type">
                                <SelectValue placeholder="Sponsor type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="school">School</SelectItem>
                                <SelectItem value="college">College</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              value={selection.institutionName}
                              onChange={(event) => updateSelection(selectedUser.id, { institutionName: event.target.value })}
                              placeholder="Sponsor school / college"
                              aria-label="Sponsor school or college"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="outline" onClick={() => setSelectedUser(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant={selection.tier === 'FREE' ? 'outline' : 'gradient'}
                            loading={isActing(selectedUser.id, selection.tier, selection.duration)}
                            onClick={() => grant(selectedUser, selection)}
                          >
                            <Crown className="h-3.5 w-3.5" />
                            {selection.tier === 'FREE' ? 'Set Free' : `Grant ${selection.tier}`}
                          </Button>
                          {selectedUser.subscription_tier !== 'FREE' && (
                            <Button
                              variant="ghost"
                              loading={isActing(selectedUser.id, 'FREE', 'lifetime')}
                              onClick={() =>
                                grant(selectedUser, {
                                  ...selection,
                                  tier: 'FREE',
                                  duration: 'lifetime',
                                })
                              }
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Revert to Free
                            </Button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 break-words text-sm ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value}</p>
    </div>
  );
}
