import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left - Form */}
      <div className="bg-background flex flex-col items-center px-4 py-6 sm:justify-center sm:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <Link href="/" className="mb-8 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              ilm <span className="gradient-text">AI</span>
            </span>
          </Link>
          {children}
        </div>
      </div>
      {/* Right - Hero */}
      <div className="to-background relative hidden flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 p-12 lg:flex">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 70%, rgba(124,58,237,0.2) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(99,102,241,0.2) 0%, transparent 50%)',
          }}
        />
        <div className="relative z-10 max-w-md text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-4 text-3xl font-bold">
            Pakistan&apos;s Leading
            <br />
            <span className="gradient-text">AI Study Platform</span>
          </h2>
          <p className="text-muted-foreground mb-8">50,000+ students already scoring higher with ilm AI</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['50K+', 'Students'],
              ['50K+', 'MCQs'],
              ['24/7', 'AI Tutor'],
              ['98%', 'Success'],
            ].map(([val, label]) => (
              <div key={label} className="glass rounded-xl border border-white/10 p-4">
                <p className="text-2xl font-bold text-violet-400">{val}</p>
                <p className="text-muted-foreground text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
