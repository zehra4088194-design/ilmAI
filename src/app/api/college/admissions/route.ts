import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { checkDailyLimit } from '@/lib/rate-limit';
import {
  ADMISSION_FILE_RULES,
  publicCollegeAdmissionSchema,
  safeAdmissionFileName,
} from '@/lib/college-erp/admission-validation';
import { createAdminClient } from '@/lib/supabase/server';
import { logRecaptchaFailure, verifyRecaptchaToken } from '@/lib/security/recaptcha-server';

export const runtime = 'nodejs';

function clientAddress(request: NextRequest) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkDailyLimit(
      `public-admission:${clientAddress(request)}`,
      'erp_mutation:public-admission',
      10
    );
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many applications from this network today.' }, { status: 429 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'A valid multipart admission form is required.' }, { status: 400 });
    }
    const recaptcha = await verifyRecaptchaToken(
      typeof formData.get('recaptcha_token') === 'string' ? String(formData.get('recaptcha_token')) : null,
      'college_admission'
    );
    if (!recaptcha.success) {
      logRecaptchaFailure('college_admission', recaptcha);
      return NextResponse.json({ error: 'Security verification failed. Please try again.' }, { status: 403 });
    }
    const input = publicCollegeAdmissionSchema.parse({
      organizationId: formData.get('organization_id'),
      campusId: formData.get('campus_id'),
      academicYearId: formData.get('academic_year_id'),
      applicantName: formData.get('applicant_name'),
      dateOfBirth: formData.get('date_of_birth'),
      gender: formData.get('gender'),
      applyingForProgram: formData.get('applying_for_program'),
      guardianName: formData.get('guardian_name'),
      guardianEmail: formData.get('guardian_email'),
      applicantEmail: formData.get('applicant_email'),
      guardianPhone: formData.get('guardian_phone'),
      previousInstitution: formData.get('previous_institution'),
      notes: formData.get('notes'),
    });
    const documents = formData
      .getAll('documents')
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (documents.length > ADMISSION_FILE_RULES.maxFiles) {
      return NextResponse.json({ error: 'Upload at most three documents.' }, { status: 400 });
    }
    for (const document of documents) {
      if (
        document.size > ADMISSION_FILE_RULES.maxBytes ||
        !ADMISSION_FILE_RULES.allowedMimeTypes.includes(document.type as never)
      ) {
        return NextResponse.json(
          { error: 'Each document must be a PDF, JPG, or PNG file up to 5 MB.' },
          { status: 400 }
        );
      }
    }

    const db = (await createAdminClient()) as any;
    const { data: organization } = await db
      .from('college_organizations')
      .select('id, status')
      .eq('id', input.organizationId)
      .in('status', ['active', 'trial'])
      .maybeSingle();
    if (!organization) return NextResponse.json({ error: 'Admissions are not currently open.' }, { status: 404 });

    if (input.campusId) {
      const { data: campus } = await db
        .from('college_campuses')
        .select('id')
        .eq('id', input.campusId)
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!campus) return NextResponse.json({ error: 'Invalid campus.' }, { status: 400 });
    }
    if (input.academicYearId) {
      const { data: academicYear } = await db
        .from('college_academic_years')
        .select('id')
        .eq('id', input.academicYearId)
        .eq('organization_id', organization.id)
        .maybeSingle();
      if (!academicYear) return NextResponse.json({ error: 'Invalid academic year.' }, { status: 400 });
    }

    const applicationNumber = `APP-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const { data: admission, error: admissionError } = await db
      .from('college_admissions')
      .insert({
        organization_id: organization.id,
        campus_id: input.campusId || null,
        academic_year_id: input.academicYearId || null,
        application_number: applicationNumber,
        applicant_name: input.applicantName,
        date_of_birth: input.dateOfBirth || null,
        gender: input.gender || null,
        applying_for_program: input.applyingForProgram,
        guardian_name: input.guardianName,
        guardian_email: input.guardianEmail || null,
        applicant_email: input.applicantEmail || null,
        guardian_phone: input.guardianPhone,
        previous_institution: input.previousInstitution || null,
        notes: input.notes || null,
        status: 'submitted',
      })
      .select('id')
      .single();
    if (admissionError) throw new Error(admissionError.message);

    const uploadedPaths: string[] = [];
    try {
      const documentRows = [];
      for (const [index, document] of documents.entries()) {
        const path = `${organization.id}/${admission.id}/${index + 1}-${safeAdmissionFileName(document.name)}`;
        const { error: uploadError } = await db.storage
          .from('college-admissions')
          .upload(path, Buffer.from(await document.arrayBuffer()), {
            contentType: document.type,
            upsert: false,
          });
        if (uploadError) throw new Error(uploadError.message);
        uploadedPaths.push(path);
        documentRows.push({
          organization_id: organization.id,
          admission_id: admission.id,
          document_type: 'supporting_document',
          file_name: document.name.slice(0, 160),
          storage_path: path,
          mime_type: document.type,
          size_bytes: document.size,
        });
      }
      if (documentRows.length) {
        const { error: documentError } = await db.from('college_admission_documents').insert(documentRows);
        if (documentError) throw new Error(documentError.message);
      }
    } catch (error) {
      if (uploadedPaths.length) await db.storage.from('college-admissions').remove(uploadedPaths);
      await db.from('college_admissions').delete().eq('id', admission.id);
      throw error;
    }

    return NextResponse.json({ applicationNumber }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Please check the required application fields.' }, { status: 400 });
    }
    console.error('Public college admission failed:', error);
    return NextResponse.json({ error: 'The application could not be submitted.' }, { status: 500 });
  }
}
