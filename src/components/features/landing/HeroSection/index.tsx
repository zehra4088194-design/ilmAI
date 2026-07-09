'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, Star, Users, BookOpen, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FLOAT_CARDS = [
  { icon: Brain, label: 'AI Tutor', desc: '24/7 Available', color: 'from-violet-500 to-purple-600', delay: 0 },
  { icon: BookOpen, label: 'MCQ Engine', desc: '50K+ Questions', color: 'from-blue-500 to-indigo-600', delay: 0.2 },
  { icon: Star, label: 'Top Scorer', desc: 'Rank #1', color: 'from-amber-500 to-orange-600', delay: 0.4 },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-background to-indigo-950" />
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.15) 0%, transparent 50%)' }} />

      {/* Animated grid */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Badge variant="outline" className="mb-6 px-4 py-2 text-sm border-violet-500/50 text-violet-300 bg-violet-500/10">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                School, College & University AI Study Platform
              </Badge>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="gradient-text">AI-Powered</span> Study<br />
              for School, College<br />
              <span className="text-violet-400">& University Students</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Board exams se semester assignments tak: AI Tutor, MCQs, Past Papers, Essays,
              Presentations, Viva Prep aur Study Plans. <strong className="text-foreground">Free mein start karo!</strong>
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button asChild size="xl" variant="gradient" className="shadow-2xl shadow-violet-500/30">
                <Link href="/register">
                  <Sparkles className="w-5 h-5" />
                  Free mein Start Karo
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="glass">
                <Link href="/pricing">Pricing Dekho</Link>
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className="flex items-center gap-6 mt-10 justify-center lg:justify-start">
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
