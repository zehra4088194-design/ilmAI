import { redirect } from 'next/navigation';
import { requireSellerUser } from '@/lib/ads/seller-auth';

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const seller = await requireSellerUser();
  if (!seller) redirect('/dashboard');

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border border-b px-4 py-4 sm:px-8">
        <p className="font-bold">Seller Dashboard</p>
        <p className="text-muted-foreground text-sm">Manage your own House Ad banners promoting ilmai.store.</p>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
    </div>
  );
}
