import { Metadata } from 'next';
import { redirect } from 'next/navigation';
export const metadata: Metadata = { title: 'MCQ' };
export default function McqPage() {
  redirect('/practice');
}
