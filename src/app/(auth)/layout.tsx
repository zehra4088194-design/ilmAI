import Link from 'next/link';
import { BookOpen } from 'lucide-react';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left - Form */}
      <div className="flex flex-col justify-center items-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center"><BookOpen className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-xl">Study<span className="gradient-text">Verse</span></span>
          </Link>
          {children}
        </div>
      </div>
      {/* Right - Hero */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-violet-950 via-indigo-950 to-background p-12 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(124,58,237,0.2) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(99,102,241,0.2) 0%, transparent 50%)' }} />
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-violet-500/30">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Pakistan Ka #1<br /><span className="gradient-text">AI Study Platform</span></h2>
          <p className="text-muted-foreground mb-8">50,000+ students already scoring higher with ilm AI</p>
          <div className="grid grid-cols-2 gap-4">
            {[['50K+', 'Students'], ['50K+', 'MCQs'], ['24/7', 'AI Tutor'], ['98%', 'Success']].map(([val, label]) => (
              <div key={label} className="glass rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-violet-400">{val}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
