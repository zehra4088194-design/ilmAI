import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ADMISSION_FILE_RULES,
  publicAdmissionSchema,
  safeAdmissionFileName,
} from '@/lib/school-erp/admission-validation';

const validAdmission = {
  organizationId: '11111111-1111-4111-8111-111111111111',
  campusId: '',
  academicYearId: '',
  applicantName: 'Ayesha Khan',
  dateOfBirth: '2012-04-08',
  gender: 'female' as const,
  applyingForClass: 'Grade 9',
  guardianName: 'Sara Khan',
  guardianEmail: 'sara@example.com',
  guardianPhone: '+92 300 1234567',
  previousSchool: '',
  notes: '',
};

describe('public school admission validation', () => {
  it('accepts a complete valid application', () => {
    expect(publicAdmissionSchema.parse(validAdmission).applicantName).toBe('Ayesha Khan');
  });

  it('rejects invalid tenant IDs and contact details', () => {
    expect(() => publicAdmissionSchema.parse({
      ...validAdmission,
      organizationId: 'not-a-tenant',
      guardianEmail: 'invalid',
    })).toThrow();
  });

  it('sanitizes storage names and keeps the free-tier file cap bounded', () => {
    expect(safeAdmissionFileName('../../Birth Card (final).pdf')).toBe('.._.._Birth_Card_final_.pdf');
    expect(ADMISSION_FILE_RULES.maxFiles).toBe(3);
    expect(ADMISSION_FILE_RULES.maxBytes).toBe(5 * 1024 * 1024);
  });
});

describe('school ERP migration security contract', () => {
  const migration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20260727100000_school_erp_core.sql'),
    'utf8',
  );

  it('enables RLS on every school table', () => {
    const tables = [...migration.matchAll(/create table if not exists public\.(school_[a-z_]+)/g)]
      .map((match) => match[1]);
    expect(tables.length).toBeGreaterThan(20);
    for (const table of tables) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it('contains composite tenant constraints and blocks admin owner escalation', () => {
    expect(migration).toContain('school_attendance_section_tenant_fk');
    expect(migration).toContain('school_payments_invoice_tenant_fk');
    expect(migration).toContain("member_role <> 'owner'");
  });
});
