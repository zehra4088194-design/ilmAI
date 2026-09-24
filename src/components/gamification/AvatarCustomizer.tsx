'use client';

import Image from 'next/image';
import { useTransition } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { equipAvatarItem, purchaseAvatarItem } from '@/app/(dashboard)/avatar/actions';

type AvatarItem = {
  id: string;
  name: string;
  slot: string;
  svg_asset_url: string;
  coin_price: number;
  is_default: boolean;
  owned?: boolean;
  equipped?: boolean;
};

const SLOT_ORDER = ['background', 'base', 'hair', 'outfit', 'accessory'];

export function AvatarCustomizer({ items, coins }: { items: AvatarItem[]; coins: number }) {
  const [pending, startTransition] = useTransition();
  const equipped = SLOT_ORDER.map((slot) => items.find((item) => item.slot === slot && item.equipped) || items.find((item) => item.slot === slot && item.is_default)).filter(Boolean) as AvatarItem[];

  const choose = (item: AvatarItem) => {
    startTransition(async () => {
      if (!item.owned && !item.is_default) {
        if (!confirm(`Buy ${item.name} for ${item.coin_price} coins?`)) return;
        const bought = await purchaseAvatarItem(item.id);
        if (bought.status !== 'success') {
          toast.error(bought.error || 'Purchase failed');
          return;
        }
      }
      const result = await equipAvatarItem(item.id);
      if (result.status === 'success') toast.success('Avatar updated');
      else toast.error(result.error || 'Could not equip item');
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="glass rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Preview</h2>
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-500"><Coins className="h-4 w-4" />{coins}</span>
        </div>
        <div className="relative mx-auto aspect-square max-w-64 overflow-hidden rounded-2xl border bg-muted">
          {equipped.map((item) => (
            <Image key={item.id} src={item.svg_asset_url} alt="" fill className="object-cover" sizes="256px" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        {SLOT_ORDER.map((slot) => (
          <div key={slot} className="glass rounded-xl p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">{slot}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.filter((item) => item.slot === slot).map((item) => (
                <button key={item.id} onClick={() => choose(item)} className="rounded-lg border bg-muted/20 p-3 text-left transition hover:border-violet-400">
                  <div className="relative mb-2 h-20 overflow-hidden rounded bg-background">
                    <Image src={item.svg_asset_url} alt={item.name} fill className="object-cover" sizes="160px" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.owned || item.is_default ? item.equipped ? 'Equipped' : 'Owned' : `${item.coin_price} coins`}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button disabled={pending} variant="outline">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Updating</Button>
      </div>
    </div>
  );
}
