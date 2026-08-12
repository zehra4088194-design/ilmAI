import type { CollegeModuleKey } from './modules';

export type CollegeRole = 'owner' | 'admin' | 'admissions' | 'teacher' | 'staff' | 'accountant' | 'parent' | 'student';

export type CollegePermission =
  | 'dashboard.read'
  | 'organization.manage'
  | 'people.read'
  | 'people.manage'
  | 'admissions.read'
  | 'admissions.manage'
  | 'attendance.read'
  | 'attendance.manage'
  | 'exams.read'
  | 'exams.manage'
  | 'fees.read'
  | 'fees.manage'
  | 'payroll.read'
  | 'payroll.manage'
  | 'academics.read'
  | 'academics.manage'
  | 'communication.read'
  | 'communication.manage'
  | 'ptm.read'
  | 'ptm.manage'
  | 'reports.read'
  | 'audit.read';

export type CollegeOrganization = {
  id: string;
  name: string;
  slug: string;
  organization_type: 'college' | 'university' | 'institute';
  status: 'trial' | 'active' | 'suspended' | 'archived';
  timezone: string;
  currency: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
};

export type CollegeMembership = {
  id: string;
  organization_id: string;
  campus_id: string | null;
  profile_id: string;
  member_role: CollegeRole;
  permissions: string[];
  employee_code: string | null;
  designation: string | null;
  status: 'invited' | 'active' | 'suspended' | 'left';
};

export type CollegeContext = {
  userId: string;
  organization: CollegeOrganization;
  membership: CollegeMembership;
  campus: { id: string; name: string; code: string } | null;
  permissions: CollegePermission[];
  // null when the institution has no plan row — treated as "everything on", mirroring school.
  enabledModules: CollegeModuleKey[] | null;
};

export type CollegeActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export const INITIAL_COLLEGE_ACTION_STATE: CollegeActionState = {
  success: false,
  message: '',
};
