import Link from 'next/link';
import { Building2, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export async function InstitutionQuickAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: schools }, { data: colleges }] = await Promise.all([
    (supabase as any)
      .from('school_memberships')
      .select('organization_id, school_organizations!school_memberships_organization_id_fkey(id,name,logo_url,status)')
      .eq('profile_id', user.id)
      .eq('member_role', 'student')
      .eq('status', 'active')
      .limit(3),
    (supabase as any)
      .from('college_memberships')
      .select('organization_id, college_organizations!college_memberships_organization_id_fkey(id,name,logo_url,status)')
      .eq('profile_id', user.id)
      .eq('member_role', 'student')
      .eq('status', 'active')
      .limit(3),
  ]);

  const entries = [
    ...((schools || []) as any[]).map((row) => {
      const organization = Array.isArray(row.school_organizations) ? row.school_organizations[0] : row.school_organizations;
      return organization && !['suspended', 'archived'].includes(organization.status)
        ? { ...organization, kind: 'school' as const, label: 'School' }
        : null;
    }),
    ...((colleges || []) as any[]).map((row) => {
      const organization = Array.isArray(row.college_organizations) ? row.college_organizations[0] : row.college_organizations;
      return organization && !['suspended', 'archived'].includes(organization.status)
        ? { ...organization, kind: 'college' as const, label: 'College' }
        : null;
    }),
  ].filter(Boolean) as Array<{ id: string; name: string; logo_url: string | null; kind: 'school' | 'college'; label: string }>;

  const unique = Array.from(new Map(entries.map((entry) => [`${entry.kind}:${entry.id}`, entry])).values());
  if (!unique.length) return null;

  return (
    <section aria-label="My Institution" className="rounded-2xl border bg-card/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold">My Institution</h2>
            <p className="text-muted-foreground text-xs">Your school/college information in one place.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {unique.map((entry) => (
            <Link
              key={`${entry.kind}:${entry.id}`}
              href={`/${entry.kind}/student-hub`}
              className="group flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-left text-sm transition hover:bg-muted/50"
            >
              {entry.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.logo_url} alt="" className="h-7 w-7 rounded-lg object-cover" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                  <Building2 className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="max-w-[220px] truncate font-semibold">{entry.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
