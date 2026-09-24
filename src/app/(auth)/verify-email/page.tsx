import { Metadata } from 'next';
import { VerifyEmailForm } from '@/components/features/auth/VerifyEmailForm';

export const metadata: Metadata = { title: 'Verify Email - ilm AI' };

export default function VerifyEmailPage() {
  return <VerifyEmailForm />;
}
