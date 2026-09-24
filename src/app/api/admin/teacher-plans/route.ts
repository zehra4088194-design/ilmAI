import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

function cleanPlan(input: any, fallback: any) {
  const studentsMax = input?.studentsMax === null || Number(input?.studentsMax) < 0 ? null : Math.max(0, Math.floor(Number(input?.studentsMax ?? fallback.studentsMax)));
  const classroomsMax = input?.classroomsMax === null || Number(input?.classroomsMax) < 0 ? null : Math.max(1, Math.floor(Number(input?.classroomsMax ?? fallback.classroomsMax ?? 1)));
  return {
    priceUsdMonthly: Math.max(0, Number(input?.priceUsdMonthly ?? fallback.priceUsdMonthly ?? 0)),
    classroomsMax,
    studentsMax,
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const db = createServiceClient();
  const { data: admin } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (String(admin?.role || '').toLowerCase() !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  const body = await req.json();
  const { data: existing, error: readError } = await db.from('platform_settings').select('value').eq('key', 'subscription_plans').maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

  const current = (existing?.value && typeof existing.value === 'object') ? existing.value as Record<string, any> : {};
  const old = current.teacherPlans || {};
  const plans = {
    free: cleanPlan(body.plans?.free, old.free || { priceUsdMonthly: 0, classroomsMax: 1, studentsMax: 10 }),
    paid: cleanPlan(body.plans?.paid, old.paid || { priceUsdMonthly: 2.99, classroomsMax: 5, studentsMax: 100 }),
    elite: cleanPlan(body.plans?.elite, old.elite || { priceUsdMonthly: 6.99, classroomsMax: null, studentsMax: 500 }),
  };

  const nextValue = { ...current, teacherPlans: plans };
  const { error } = await db.from('platform_settings').upsert({ key: 'subscription_plans', value: nextValue, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans });
}
