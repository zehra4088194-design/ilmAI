import { redirect } from 'next/navigation';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { TeacherAIToolkit } from '@/components/features/teacher/TeacherAIToolkit';

export default async function SchoolTeacherToolsPage() {
  const { user, context } = await requireSchoolContext('academics.read');
  if (!user) redirect('/login');
  if (!context || !['owner','admin','coordinator','teacher'].includes(context.membership.member_role)) redirect('/school');
  return <main className="mx-auto max-w-5xl p-4 sm:p-6"><div className="mb-5"><p className="text-sm font-semibold text-violet-500">{context.organization.name} · ilm AI</p><h1 className="text-3xl font-black">Teacher AI Tools</h1></div><TeacherAIToolkit /></main>;
}
