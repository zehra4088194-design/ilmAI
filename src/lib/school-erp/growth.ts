// ============================================
// SCHOOL / COLLEGE GROWTH INSIGHTS (deterministic — no AI call)
// A principal-facing "how is the institution trending" view: admissions vs
// withdrawals, attendance, and fee recovery over the last 6 months, reduced to
// one growth score and a short list of concrete recommended actions.
//
// Pure computation lives here so both school-erp/queries.ts and
// college-erp/queries.ts (which has its own class-equivalent join names) can
// fetch their own rows and share the same math — the same cross-directory
// reuse pattern already used for PrincipalDirectoryMessenger etc.
// ============================================

const MONTHS_BACK = 6;

export type MonthBucket = { key: string; label: string };

export function lastMonthBuckets(count = MONTHS_BACK): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, label: d.toLocaleDateString('en-US', { month: 'short' }) });
  }
  return buckets;
}

function monthKey(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export type GrowthInsights = {
  growthScore: number;
  admissionsVsWithdrawals: Array<{ month: string; admissions: number; withdrawals: number }>;
  attendanceTrend: Array<{ month: string; rate: number }>;
  feeRecovery: Array<{ month: string; recoveryPct: number; billed: number; collected: number }>;
  summary: {
    activeStudents: number;
    netChange: number;
    avgAttendanceRate: number;
    avgFeeRecoveryPct: number;
    currency: string;
  };
  recommendations: string[];
};

export function computeGrowthInsights(input: {
  currency: string;
  activeStudents: number;
  // one row per enrollment created/updated within the window
  enrollmentEvents: Array<{ enrolled_on: string; status: string; updated_at: string }>;
  attendance60d: Array<{ status: string; attendance_date: string }>;
  invoices: Array<{ status: string; total_amount: number; paid_amount: number; due_date: string }>;
  // last 30 days attendance grouped by section/class label, for the per-class callout
  sectionAttendance: Array<{ label: string; status: string }>;
  today: string;
}): GrowthInsights {
  const buckets = lastMonthBuckets();
  const bucketKeys = new Set(buckets.map((b) => b.key));

  const admissionsByMonth = new Map<string, number>();
  const withdrawalsByMonth = new Map<string, number>();
  for (const row of input.enrollmentEvents) {
    if (row.status === 'withdrawn') {
      const key = monthKey(row.updated_at);
      if (key && bucketKeys.has(key)) withdrawalsByMonth.set(key, (withdrawalsByMonth.get(key) || 0) + 1);
    } else {
      const key = monthKey(row.enrolled_on);
      if (key && bucketKeys.has(key)) admissionsByMonth.set(key, (admissionsByMonth.get(key) || 0) + 1);
    }
  }
  const admissionsVsWithdrawals = buckets.map((b) => ({
    month: b.label,
    admissions: admissionsByMonth.get(b.key) || 0,
    withdrawals: withdrawalsByMonth.get(b.key) || 0,
  }));
  const totalAdmissions = admissionsVsWithdrawals.reduce((s, r) => s + r.admissions, 0);
  const totalWithdrawals = admissionsVsWithdrawals.reduce((s, r) => s + r.withdrawals, 0);

  const attendanceMarkedByMonth = new Map<string, number>();
  const attendancePresentByMonth = new Map<string, number>();
  for (const row of input.attendance60d) {
    const key = monthKey(row.attendance_date);
    if (!key || !bucketKeys.has(key)) continue;
    attendanceMarkedByMonth.set(key, (attendanceMarkedByMonth.get(key) || 0) + 1);
    if (row.status === 'present' || row.status === 'late') {
      attendancePresentByMonth.set(key, (attendancePresentByMonth.get(key) || 0) + 1);
    }
  }
  const attendanceTrend = buckets.map((b) => {
    const marked = attendanceMarkedByMonth.get(b.key) || 0;
    const present = attendancePresentByMonth.get(b.key) || 0;
    return { month: b.label, rate: marked ? Math.round((present / marked) * 1000) / 10 : 0 };
  });
  const attendanceMonthsWithData = attendanceTrend.filter((m) => m.rate > 0 || attendanceMarkedByMonth.get(buckets.find((b) => b.label === m.month)!.key));
  const avgAttendanceRate = attendanceMonthsWithData.length
    ? Math.round((attendanceMonthsWithData.reduce((s, m) => s + m.rate, 0) / attendanceMonthsWithData.length) * 10) / 10
    : 0;

  const billedByMonth = new Map<string, number>();
  const collectedByMonth = new Map<string, number>();
  for (const row of input.invoices) {
    const key = monthKey(row.due_date);
    if (!key || !bucketKeys.has(key)) continue;
    billedByMonth.set(key, (billedByMonth.get(key) || 0) + Number(row.total_amount || 0));
    collectedByMonth.set(key, (collectedByMonth.get(key) || 0) + Math.min(Number(row.paid_amount || 0), Number(row.total_amount || 0)));
  }
  const feeRecovery = buckets.map((b) => {
    const billed = Math.round(billedByMonth.get(b.key) || 0);
    const collected = Math.round(collectedByMonth.get(b.key) || 0);
    return { month: b.label, recoveryPct: billed ? Math.round((collected / billed) * 1000) / 10 : 0, billed, collected };
  });
  const monthsWithBilling = feeRecovery.filter((m) => m.billed > 0);
  const avgFeeRecoveryPct = monthsWithBilling.length
    ? Math.round((monthsWithBilling.reduce((s, m) => s + m.recoveryPct, 0) / monthsWithBilling.length) * 10) / 10
    : 0;

  const growthComponent = totalAdmissions + totalWithdrawals ? (totalAdmissions / (totalAdmissions + totalWithdrawals)) * 100 : 50;
  const growthScore = Math.round(
    0.4 * Math.min(100, avgAttendanceRate) + 0.35 * Math.min(100, avgFeeRecoveryPct) + 0.25 * growthComponent
  );

  // --- Recommended actions (deterministic, from the same numbers above) ---
  const recommendations: string[] = [];
  const overdue30 = input.invoices.filter((row) => {
    if (!['issued', 'partial', 'overdue'].includes(row.status)) return false;
    const outstanding = Number(row.total_amount || 0) - Number(row.paid_amount || 0);
    if (outstanding <= 0) return false;
    const daysOverdue = (new Date(input.today).getTime() - new Date(row.due_date).getTime()) / 86_400_000;
    return daysOverdue > 30;
  });
  const overdueTotal = Math.round(overdue30.reduce((s, r) => s + (Number(r.total_amount || 0) - Number(r.paid_amount || 0)), 0));
  if (overdue30.length > 0) {
    recommendations.push(
      `${overdue30.length} student${overdue30.length === 1 ? '' : 's'} have pending fees over 30 days, totaling ${input.currency} ${overdueTotal.toLocaleString()}. Send a fee reminder broadcast.`
    );
  }

  const sectionStats = new Map<string, { present: number; total: number }>();
  for (const row of input.sectionAttendance) {
    const current = sectionStats.get(row.label) || { present: 0, total: 0 };
    current.total += 1;
    if (row.status === 'present' || row.status === 'late') current.present += 1;
    sectionStats.set(row.label, current);
  }
  const lowAttendanceSections = Array.from(sectionStats.entries())
    .map(([label, s]) => ({ label, rate: s.total ? Math.round((s.present / s.total) * 100) : 100 }))
    .filter((s) => s.rate < 75)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);
  for (const section of lowAttendanceSections) {
    recommendations.push(`${section.label} attendance is ${section.rate}%, below the 75% target over the last 30 days.`);
  }

  const lastMonth = admissionsVsWithdrawals[admissionsVsWithdrawals.length - 1];
  if (lastMonth && lastMonth.withdrawals > lastMonth.admissions) {
    recommendations.push(
      `Net enrollment declined last month: ${lastMonth.withdrawals} withdrawal${lastMonth.withdrawals === 1 ? '' : 's'} vs ${lastMonth.admissions} new admission${lastMonth.admissions === 1 ? '' : 's'}.`
    );
  }
  if (avgFeeRecoveryPct > 0 && avgFeeRecoveryPct < 70) {
    recommendations.push(`Fee recovery has averaged ${avgFeeRecoveryPct}% over the last 6 months — below the 70% benchmark.`);
  }
  if (!recommendations.length) {
    recommendations.push('No red flags in attendance, fees, or enrollment right now — keep it up.');
  }

  return {
    growthScore: Math.max(0, Math.min(100, growthScore)),
    admissionsVsWithdrawals,
    attendanceTrend,
    feeRecovery,
    summary: {
      activeStudents: input.activeStudents,
      netChange: totalAdmissions - totalWithdrawals,
      avgAttendanceRate,
      avgFeeRecoveryPct,
      currency: input.currency,
    },
    recommendations: recommendations.slice(0, 5),
  };
}
