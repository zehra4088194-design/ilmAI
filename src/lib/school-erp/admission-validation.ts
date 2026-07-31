import { z } from 'zod';

export const publicAdmissionSchema = z.object({
  organizationId: z.string().uuid(),
  campusId: z.string().uuid().optional().or(z.literal('')),
  academicYearId: z.string().uuid().optional().or(z.literal('')),
  applicantName: z.string().trim().min(2).max(120),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  gender: z.enum(['female', 'male', 'other', 'prefer_not_to_say']).optional().or(z.literal('')),
  applyingForClass: z.string().trim().min(1).max(80),
  guardianName: z.string().trim().min(2).max(120),
  guardianEmail: z.string().trim().email().max(254).optional().or(z.literal('')),
  guardianPhone: z.string().trim().min(7).max(30),
  previousSchool: z.string().trim().max(160).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const ADMISSION_FILE_RULES = {
  maxFiles: 3,
  maxBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
} as const;

export function safeAdmissionFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(-100);
  return cleaned || 'document';
}
