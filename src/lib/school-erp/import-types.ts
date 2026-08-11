// Shared shapes for the bulk importer. Kept out of import-actions.ts because
// a 'use server' module may only export async functions — a plain const there
// fails the build.

export type SchoolImportCredential = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export type SchoolImportState = {
  success: boolean;
  message: string;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; name: string; error: string }>;
  credentials: SchoolImportCredential[];
};

export const INITIAL_SCHOOL_IMPORT_STATE: SchoolImportState = {
  success: false,
  message: '',
  created: 0,
  updated: 0,
  failed: 0,
  errors: [],
  credentials: [],
};
