import { Metadata } from 'next';
import { RegisterForm } from '@/components/features/auth/RegisterForm';
export const metadata: Metadata = { title: 'Register - StudyVerse AI' };
export default function RegisterPage() { return <RegisterForm />; }
