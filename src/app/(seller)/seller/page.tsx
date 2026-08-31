import type { Metadata } from 'next';
import { SellerAdsManager } from '@/components/features/seller/SellerAdsManager';

export const metadata: Metadata = { title: 'Seller Dashboard' };

export default function SellerPage() {
  return <SellerAdsManager />;
}
