import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ParentLinkJoinClient, ParentLinkSignedOut } from '@/components/features/parent/ParentLinkJoinClient';

export const metadata: Metadata = { title: 'Parent Link - ilm AI' };

export default async function ParentLinkPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams;
  const code = String(params.code || '').trim().toUpperCase();

  if (!code) {
    redirect('/login');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ParentLinkSignedOut code={code} />;
  }

  return <ParentLinkJoinClient code={code} />;
}
