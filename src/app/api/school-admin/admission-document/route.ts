import { NextRequest, NextResponse } from 'next/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get('id');
  if (!documentId) return NextResponse.json({ error: 'Document is required.' }, { status: 400 });

  const { supabase, user, context } = await requireSchoolContext('admissions.read');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: document } = await (supabase as any)
    .from('school_admission_documents')
    .select('id, organization_id, storage_path')
    .eq('id', documentId)
    .eq('organization_id', context.organization.id)
    .maybeSingle();
  if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

  const admin = await createAdminClient();
  const { data, error } = await admin.storage
    .from('school-admissions')
    .createSignedUrl(document.storage_path, 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Document could not be opened.' }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}
