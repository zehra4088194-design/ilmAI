'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, Star, BookOpen, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FLOAT_CARDS = [
  { icon: Brain, label: 'AI Tutor', desc: '24/7 Available', color: 'from-violet-500 to-purple-600', delay: 0 },
  { icon: BookOpen, label: 'MCQ Engine', desc: '50K+ Questions', color: 'from-blue-500 to-indigo-600', delay: 0.2 },
  { icon: Star, label: 'Top Scorer', desc: 'Rank #1', color: 'from-amber-500 to-orange-600', delay: 0.4 },
];

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden overflow-x-clip px-0 pt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-background to-indigo-950" />
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.15) 0%, transparent 50%)' }} />

      {/* Animated grid */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="container relative z-10 mx-auto max-w-full px-4">
        <div className="grid min-w-0 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left Content */}
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="min-w-0 text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Badge variant="outline" className="mb-5 max-w-full whitespace-normal px-3 py-2 text-center text-xs leading-relaxed sm:mb-6 sm:px-4 sm:text-sm border-violet-500/50 text-violet-300 bg-violet-500/10">
                <Sparkles className="mr-2 h-3.5 w-3.5 flex-shrink-0" />
                <span className="min-w-0">School, College & University AI Study Platform</span>
              </Badge>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="mb-5 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl lg:mb-6 lg:text-6xl">
              <span className="gradient-text">AI-Powered</span> Study<br className="hidden sm:block" />
              <span className="sm:hidden"> </span>for School, College<br />
              <span className="text-violet-400">& University Students</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="mx-auto mb-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0 lg:mb-8">
              Board exams se semester assignments tak: AI Tutor, MCQs, Past Papers, Essays,
              Presentations, Viva Prep aur Study Plans. <strong className="text-foreground">Free mein start karo!</strong>
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="mx-auto flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4 lg:mx-0 lg:justify-start">
              <Button asChild size="xl" variant="gradient" className="h-auto min-h-14 w-full whitespace-normal px-5 text-base leading-snug shadow-2xl shadow-violet-500/30 sm:w-auto sm:px-8 sm:text-lg">
                <Link href="/register">
                  <Sparkles className="h-5 w-5 flex-shrink-0" />
                  <span>Free mein Start Karo</span>
                  <ArrowRight className="h-5 w-5 flex-shrink-0" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="glass" className="h-auto min-h-14 w-full whitespace-normal px-5 text-base leading-snug sm:w-auto sm:px-8 sm:text-lg">
                <Link href="/demo">Try Free Demo</Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="h-auto min-h-14 w-full whitespace-normal border-violet-500/35 bg-background/20 px-5 text-base leading-snug sm:w-auto sm:px-8 sm:text-lg">
                <Link href="/pricing">Pricing Dekho</Link>
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className="mt-8 flex min-w-0 items-center justify-center gap-4 sm:gap-6 lg:mt-10 lg:justify-start">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 border-2 border-background flex items-center justify-center text-xs font-bold text-white">{i}</div>
                ))}
              </div>
              <div className="text-sm"><span className="font-bold text-foreground">School to University</span> <span className="text-muted-foreground">study workflows in one place</span></div>
            </motion.div>
          </motion.div>

          {/* Right - Floating Cards */}
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:flex items-center justify-center relative h-[500px]">
            {/* Central Card */}
            <motion.div animate={{ y: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="glass rounded-2xl p-6 border border-violet-500/30 w-72 shadow-2xl shadow-violet-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">AI Tutor Session</p>
                  <p className="text-xs text-muted-foreground">Physics - Chapter 5</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground text-xs mb-1">AI Tutor</p>
                  <p>Newton ke 3rd Law mein action aur reaction forces hamesha equal aur opposite hote hain...</p>
                </div>
                <div className="bg-violet-500/10 rounded-lg p-3 text-sm border border-violet-500/20">
                  <p className="text-violet-400 text-xs mb-1">Student</p>
                  <p>Kya aap iska example de sakte hain?</p>
                </div>
              </div>
            </motion.div>

            {/* Floating mini cards */}
            {FLOAT_CARDS.map((card, i) => {
              const positions = ['-top-4 -right-4', 'bottom-16 -right-8', '-bottom-4 left-8'];
              return (
                <motion.div key={i}
                  animate={{ y: [-3, 3, -3] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: card.delay }}
                  className={`absolute ${positions[i]} glass rounded-xl p-4 border border-border/50 shadow-lg w-40`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-2`}>
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-semibold text-xs">{card.label}</p>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
