export type SchoolRole = 'owner' | 'admin' | 'admissions' | 'teacher' | 'staff' | 'accountant' | 'parent' | 'student';

export type SchoolPermission =
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

export type SchoolOrganization = {
  id: string;
  name: string;
  slug: string;
  organization_type: 'school' | 'academy' | 'college';
  status: 'trial' | 'active' | 'suspended' | 'archived';
  timezone: string;
  currency: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
};

export type SchoolMembership = {
  id: string;
  organization_id: string;
  campus_id: string | null;
  profile_id: string;
  member_role: SchoolRole;
  permissions: string[];
  employee_code: string | null;
  designation: string | null;
  status: 'invited' | 'active' | 'suspended' | 'left';
};

export type SchoolContext = {
  userId: string;
  organization: SchoolOrganization;
  membership: SchoolMembership;
  campus: { id: string; name: string; code: string } | null;
  permissions: SchoolPermission[];
};

export type SchoolActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export const INITIAL_SCHOOL_ACTION_STATE: SchoolActionState = {
  success: false,
  message: '',
};
