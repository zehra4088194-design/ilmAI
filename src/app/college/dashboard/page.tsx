import { redirect } from 'next/navigation';

export const metadata = { title: 'My College | ilm AI' };

export default async function LegacyCollegeDashboardPage() {
  redirect('/college');
}
