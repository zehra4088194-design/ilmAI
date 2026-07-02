import { Metadata } from 'next';
import { LoginForm } from '@/components/features/auth/LoginForm';
export const metadata: Metadata = { title: 'Login - StudyVerse AI' };
export default function LoginPage() { return <LoginForm />; }
