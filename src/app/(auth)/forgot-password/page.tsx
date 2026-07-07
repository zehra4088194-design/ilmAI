import { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm';
export const metadata: Metadata = { title: 'Forgot Password - ilm AI' };
export default function ForgotPasswordPage() { return <ForgotPasswordForm />; }
