// ============================================
// SCHOOL MODULE GATING
// `school_organization_plan_settings.enabled_modules` decides which ERP
// modules an institution actually gets. Platform admins set it per school in
// /admin/schools, and every gated page + sidebar entry reads it from here.
//
// Fail-open by design: a school whose plan row is missing keeps full access.
// Locking a paying school out of its own records because a settings row never
// got created is worse than showing a module they did not buy.
// ============================================
export type SchoolModuleKey =
  | 'dashboard'
  | 'people'
  | 'admissions'
  | 'attendance'
  | 'exams'
  | 'tests'
  | 'fees'
  | 'payroll'
  | 'academics'
  | 'ptm'
  | 'communication'
  | 'reports'
  | 'resources';

export const SCHOOL_MODULES: Array<{ key: SchoolModuleKey; label: string; description: string }> = [
  { key: 'dashboard', label: 'Dashboard', description: 'Overview, launchpad, and organization settings' },
  { key: 'people', label: 'People', description: 'Students, staff, guardians, enrollment, and CSV import' },
  { key: 'admissions', label: 'Admissions', description: 'Public admission form and applicant pipeline' },
  { key: 'attendance', label: 'Attendance', description: 'Daily student register and staff attendance' },
  { key: 'exams', label: 'Exams & Results', description: 'Date sheets, marks entry, and report cards' },
  { key: 'tests', label: 'AI Test Studio', description: 'AI-generated branded test papers' },
  { key: 'fees', label: 'Fees', description: 'Fee structures, vouchers, and payment records' },
  { key: 'payroll', label: 'Payroll', description: 'Staff salaries and monthly payroll runs' },
  { key: 'academics', label: 'Academics', description: 'Homework, timetable, lesson plans, and calendar' },
  { key: 'ptm', label: 'PTM Meetings', description: 'Parent-teacher meeting slots and requests' },
  { key: 'communication', label: 'Communication', description: 'Announcements and guardian messaging' },
  { key: 'reports', label: 'Reports', description: 'Institution reports and exports' },
  { key: 'resources', label: 'Resources', description: 'Shared institutional study material' },
];

// Turning these off would strand an owner outside their own settings, so they
// stay on regardless of what the plan row says.
const ALWAYS_ON: SchoolModuleKey[] = ['dashboard'];

export const DEFAULT_SCHOOL_MODULES: SchoolModuleKey[] = SCHOOL_MODULES.map((item) => item.key);

export function normalizeSchoolModules(value: unknown): SchoolModuleKey[] | null {
  if (!Array.isArray(value)) return null;
  const known = new Set<string>(DEFAULT_SCHOOL_MODULES);
  const modules = value
    .map((item) => String(item).trim().toLowerCase())
    .filter((item): item is SchoolModuleKey => known.has(item));
  // An empty array is a real answer ("dashboard only"), unlike a missing row.
  return Array.from(new Set([...ALWAYS_ON, ...modules]));
}

export function isSchoolModuleEnabled(enabledModules: SchoolModuleKey[] | null, module: SchoolModuleKey) {
  if (ALWAYS_ON.includes(module)) return true;
  // null means "no plan row / unreadable" — see fail-open note above.
  if (!enabledModules) return true;
  return enabledModules.includes(module);
}
