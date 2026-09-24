import { redirect } from 'next/navigation';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { InstitutionAIWidget } from '@/components/features/institution/InstitutionAIWidget';

export default async function CollegeInstitutionAIPage() {
  const { user, context } = await requireCollegeContext('dashboard.read');
  if (!user) redirect('/login');
  if (!context || !['student','parent','owner','admin','coordinator','teacher','staff'].includes(context.membership.member_role)) redirect('/college');
  const staffMode = ['owner','admin','coordinator','teacher','staff'].includes(context.membership.member_role);
  return <main className="mx-auto max-w-4xl p-4 sm:p-6"><div className="mb-5"><p className="text-sm font-semibold text-violet-500">{context.organization.name} · ilm AI</p><h1 className="text-3xl font-black">Institution AI</h1></div><InstitutionAIWidget kind="college" staffMode={staffMode} /></main>;
}
