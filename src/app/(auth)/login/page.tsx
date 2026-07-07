import { Metadata } from 'next';
import { LoginForm } from '@/components/features/auth/LoginForm';
export const metadata: Metadata = { title: 'Login - ilm AI' };
export default function LoginPage() { return <LoginForm />; }
