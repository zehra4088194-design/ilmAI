import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { getSchoolContext } from '@/lib/school-erp/access';
import { getCollegeContext } from '@/lib/college-erp/access';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
    const body = await req.json();
    const question = String(body.question || '').trim().slice(0, 2000);
    const requestedKind = body.kind === 'college' ? 'college' : 'school';
    if (!question) return NextResponse.json({ error: 'Ask a question first.' }, { status: 400 });

    const school = requestedKind === 'school' ? await getSchoolContext(supabase, user.id) : null;
    const college = requestedKind === 'college' ? await getCollegeContext(supabase, user.id) : null;
    const context: any = school || college;
    const kind = school ? 'school' : college ? 'college' : null;
    if (!context || !kind) return NextResponse.json({ error: 'Institution access is required.' }, { status: 403 });

    const role = context.membership.member_role;
    const studentLike = role === 'student';
    const parentLike = role === 'parent';
    const staffLike = ['owner', 'admin', 'coordinator', 'teacher', 'staff'].includes(role);
    const db = supabase as any;
    let evidence: any = {};

    if (kind === 'school') {
      const org = context.organization.id;
      if (studentLike || parentLike) {
        let ids: string[] = [user.id];
        if (parentLike) {
          const { data: guardians } = await db.from('school_guardians').select('student_id').eq('organization_id', org).eq('guardian_id', user.id);
          ids = (guardians || []).map((x: any) => x.student_id).filter(Boolean);
        }
        const safeIds = ids.length ? ids : ['00000000-0000-0000-0000-000000000000'];
        const [{ data: marks }, { data: attendance }, { data: exams }] = await Promise.all([
          db.from('school_report_cards').select('percentage,gpa,grade,class_position,summary,published_at,school_exams(name)').eq('organization_id', org).in('student_id', safeIds).not('published_at','is',null).order('published_at',{ascending:false}).limit(12),
          db.from('school_attendance_records').select('attendance_date,status').eq('organization_id', org).in('student_id', safeIds).order('attendance_date',{ascending:false}).limit(120),
          db.from('school_exam_schedules').select('subject_name,exam_date,starts_at,ends_at,room,school_exams(name)').eq('organization_id', org).gte('exam_date',new Date().toISOString().slice(0,10)).order('exam_date').limit(12),
        ]);
        evidence = { studentRecords: marks || [], attendance: attendance || [], upcomingExams: exams || [] };
      } else if (staffLike) {
        const [{ data: marks }, { data: attendance }] = await Promise.all([
          db.from('school_report_cards').select('student_id,percentage,gpa,grade,class_position,summary,published_at,school_exams(name)').eq('organization_id', org).not('published_at','is',null).order('published_at',{ascending:false}).limit(500),
          db.from('school_attendance_records').select('student_id,status,attendance_date').eq('organization_id', org).gte('attendance_date',new Date(Date.now()-30*86400000).toISOString().slice(0,10)).limit(2000),
        ]);
        evidence = { recentReportCards: marks || [], attendanceLast30Days: attendance || [] };
      }
    } else {
      const org = context.organization.id;
      if (studentLike || parentLike) {
        let ids: string[] = [user.id];
        if (parentLike) {
          const { data: guardians } = await db.from('college_guardians').select('student_id').eq('organization_id', org).eq('guardian_id', user.id);
          ids = (guardians || []).map((x: any) => x.student_id).filter(Boolean);
        }
        const safeIds = ids.length ? ids : ['00000000-0000-0000-0000-000000000000'];
        const [{ data: marks }, { data: attendance }, { data: exams }] = await Promise.all([
          db.from('college_report_cards').select('percentage,gpa,grade,class_position,summary,published_at,college_exams(name)').eq('organization_id', org).in('student_id', safeIds).not('published_at','is',null).order('published_at',{ascending:false}).limit(12),
          db.from('college_attendance_records').select('attendance_date,status').eq('organization_id', org).in('student_id', safeIds).order('attendance_date',{ascending:false}).limit(120),
          db.from('college_exam_schedules').select('course_name,exam_date,starts_at,ends_at,room,college_exams(name)').eq('organization_id', org).gte('exam_date',new Date().toISOString().slice(0,10)).order('exam_date').limit(12),
        ]);
        evidence = { studentRecords: marks || [], attendance: attendance || [], upcomingExams: exams || [] };
      } else if (staffLike) {
        const [{ data: marks }, { data: attendance }] = await Promise.all([
          db.from('college_report_cards').select('student_id,percentage,gpa,grade,class_position,summary,published_at,college_exams(name)').eq('organization_id', org).not('published_at','is',null).order('published_at',{ascending:false}).limit(500),
          db.from('college_attendance_records').select('student_id,status,attendance_date').eq('organization_id', org).gte('attendance_date',new Date(Date.now()-30*86400000).toISOString().slice(0,10)).limit(2000),
        ]);
        evidence = { recentReportCards: marks || [], attendanceLast30Days: attendance || [] };
      }
    }

    const provider = await resolveAiRoutingProvider('studyTools');
    const result = await gatewayChat({
      provider,
      strictProvider: true,
      routingPolicy: 'text',
      tier: 'mini',
      maxTokens: 1200,
      temperature: 0.2,
      messages: [
        { role: 'system', content: `You are ilm AI Institution Analyst for a ${kind}. Answer using ONLY the supplied institutional evidence. Be concrete, concise, and show calculations/patterns where possible. Never invent names, marks, attendance, or exams. Role: ${role}.` },
        { role: 'user', content: `Question: ${question}\n\nInstitution evidence JSON:\n${JSON.stringify(evidence).slice(0, 50000)}` },
      ],
    });
    return NextResponse.json({ answer: result.text, kind, role });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Institution AI failed.' }, { status: 500 });
  }
}
