'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Seller = { email: string; created_at: string };

/**
 * Admin-only allowlist of seller emails — the only thing that grants /seller access. A seller
 * can create/manage only their own House Ad banners; nothing else in the admin panel is reachable
 * from there. See requireSellerUser() and the /api/seller/ads routes.
 */
export function SellerEmailsCard() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ads/sellers');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Sellers could not be loaded.');
      setSellers(json.sellers || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sellers could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addSeller() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const response = await fetch('/api/admin/ads/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Seller could not be added.');
      setEmail('');
      toast.success(`${trimmed} can now sign in and manage their own banners at /seller.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Seller could not be added.');
    } finally {
      setAdding(false);
    }
  }

  async function removeSeller(sellerEmail: string) {
    if (!confirm(`Remove ${sellerEmail} as a seller? Their existing banners stay live but they lose /seller access.`)) return;
    try {
      const response = await fetch(`/api/admin/ads/sellers?email=${encodeURIComponent(sellerEmail)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setSellers((current) => current.filter((s) => s.email !== sellerEmail));
      toast.success('Seller removed.');
    } catch {
      toast.error('Seller could not be removed.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sellers</CardTitle>
        <p className="text-muted-foreground text-sm">
          Anyone whose email is added here can sign in and manage only their own House Ad banners at{' '}
          <code className="bg-muted rounded px-1">/seller</code> — nothing else in the admin panel.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addSeller()}
            placeholder="seller@example.com"
            type="email"
            className="max-w-xs"
          />
          <Button type="button" size="sm" variant="gradient" onClick={() => void addSeller()} disabled={adding || !email.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Add seller
          </Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : sellers.length === 0 ? (
          <p className="text-muted-foreground text-sm">No sellers yet.</p>
        ) : (
          <div className="space-y-1.5">
            {sellers.map((seller) => (
              <div key={seller.email} className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>{seller.email}</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove seller" onClick={() => void removeSeller(seller.email)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
