// College mirror of src/lib/school-erp/import-types.ts. Kept out of import-actions.ts because a
// 'use server' module may only export async functions — a plain const there fails the build.

export type CollegeImportCredential = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export type CollegeImportState = {
  success: boolean;
  message: string;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; name: string; error: string }>;
  credentials: CollegeImportCredential[];
};

export const INITIAL_COLLEGE_IMPORT_STATE: CollegeImportState = {
  success: false,
  message: '',
  created: 0,
  updated: 0,
  failed: 0,
  errors: [],
  credentials: [],
};
