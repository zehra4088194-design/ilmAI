// Plain (non-'use server') value split out of admin-actions.ts — a file with a top-level
// 'use server' directive can only export async functions, and INITIAL_QURAN_ACTION_STATE is a
// plain object constant (the useActionState initial value), not a function. Keeping it here is
// what makes `next build` pass.

export type QuranActionState = { success: boolean; message: string };
export const INITIAL_QURAN_ACTION_STATE: QuranActionState = { success: false, message: '' };
