// College-side mirror of src/lib/school-erp/modules.ts. Same fail-open design: a college
// whose plan row is missing keeps full access rather than being locked out of its own records.
export type CollegeModuleKey =
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

export const COLLEGE_MODULES: Array<{ key: CollegeModuleKey; label: string; description: string }> = [
  { key: 'dashboard', label: 'Dashboard', description: 'Overview, launchpad, and organization settings' },
  { key: 'people', label: 'People', description: 'Students, staff, guardians, enrollment, and CSV import' },
  { key: 'admissions', label: 'Admissions', description: 'Public admission form and applicant pipeline' },
  { key: 'attendance', label: 'Attendance', description: 'Daily student register and staff attendance' },
  { key: 'exams', label: 'Exams & Results', description: 'Exam schedules, marks entry, and report cards' },
  { key: 'tests', label: 'AI Test Studio', description: 'AI-generated branded test papers' },
  { key: 'fees', label: 'Fees', description: 'Fee structures, vouchers, and payment records' },
  { key: 'payroll', label: 'Payroll', description: 'Staff salaries and monthly payroll runs' },
  { key: 'academics', label: 'Academics', description: 'Assignments, timetable, lesson plans, and calendar' },
  { key: 'ptm', label: 'PTM Meetings', description: 'Parent-teacher meeting slots and requests' },
  { key: 'communication', label: 'Communication', description: 'Announcements and guardian messaging' },
  { key: 'reports', label: 'Reports', description: 'Institution reports and exports' },
  { key: 'resources', label: 'Resources', description: 'Shared institutional study material' },
];

const ALWAYS_ON: CollegeModuleKey[] = ['dashboard'];

export const DEFAULT_COLLEGE_MODULES: CollegeModuleKey[] = COLLEGE_MODULES.map((item) => item.key);

export function normalizeCollegeModules(value: unknown): CollegeModuleKey[] | null {
  if (!Array.isArray(value)) return null;
  const known = new Set<string>(DEFAULT_COLLEGE_MODULES);
  const modules = value
    .map((item) => String(item).trim().toLowerCase())
    .filter((item): item is CollegeModuleKey => known.has(item));
  return Array.from(new Set([...ALWAYS_ON, ...modules]));
}

export function isCollegeModuleEnabled(enabledModules: CollegeModuleKey[] | null, module: CollegeModuleKey) {
  if (ALWAYS_ON.includes(module)) return true;
  if (!enabledModules) return true;
  return enabledModules.includes(module);
}
