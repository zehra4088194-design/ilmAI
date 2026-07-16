import Link from 'next/link';
import { Inbox, Video, FileText, Users } from 'lucide-react';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getCollegeAdminContext } from '@/lib/college/access';
import {
  getPendingJoinRequests,
  getCollegeLectures,
  getCollegeResources,
  getApprovedStudents,
} from '@/lib/college/queries';

export const metadata = { title: 'College Admin | ilm AI' };

export default async function CollegeAdminHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The layout above already redirects if this fails; the check here is
  // just to satisfy TypeScript's non-null expectations for `user.id` below.
  if (!user) return null;

  const context = await getCollegeAdminContext(supabase, user.id);
  if (!context) return null;
  const admin = await createAdminClient();

  const [pending, lectures, resources, students] = await Promise.all([
    getPendingJoinRequests(supabase, context.college.id),
    getCollegeLectures(supabase, context.college.id),
    getCollegeResources(admin, context.college.id),
    getApprovedStudents(supabase, context.college.id),
  ]);

  const cards = [
    { href: '/college-admin/requests', label: 'Pending requests', value: pending.length, icon: Inbox },
    { href: '/college-admin/lectures', label: 'Lectures', value: lectures.length, icon: Video },
    { href: '/college-admin/resources', label: 'Resources', value: resources.length, icon: FileText },
    { href: '/college-admin/students', label: 'Students', value: students.length, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Welcome back</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="glass border-border/60 bg-card/60 flex flex-col gap-2 rounded-2xl border p-5 backdrop-blur-xl transition-shadow hover:shadow-md"
          >
            <card.icon className="text-muted-foreground h-5 w-5" />
            <span className="text-2xl font-bold">{card.value}</span>
            <span className="text-muted-foreground text-sm">{card.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
