'use client';

import { switchSchoolOrganization } from '@/lib/school-erp/context-actions';
import type { SchoolRole } from '@/lib/school-erp/types';

export function SchoolOrganizationSwitcher({
  currentId,
  organizations,
  returnTo,
}: {
  currentId: string;
  organizations: Array<{ id: string; name: string; role: SchoolRole }>;
  returnTo: '/school' | '/school-admin';
}) {
  if (organizations.length < 2) return null;
  return (
    <form action={switchSchoolOrganization}>
      <input type="hidden" name="return_to" value={returnTo} />
      <label htmlFor="member-school-switcher" className="sr-only">Active school</label>
      <select
        id="member-school-switcher"
        name="organization_id"
        defaultValue={currentId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="border-input bg-background h-9 max-w-52 rounded-lg border px-2 text-xs"
      >
        {organizations.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.role})</option>)}
      </select>
    </form>
  );
}
