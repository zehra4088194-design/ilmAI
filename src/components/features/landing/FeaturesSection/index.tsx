'use client';
import { motion } from 'framer-motion';
import { Brain, Zap, Trophy, BookOpen, BarChart3, FileText } from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'AI Tutor 24/7', desc: 'Kabhi bhi, kahin bhi sawal pucho. Assistant se instant, detailed answers milenge Urdu ya English mein.', color: 'from-violet-500 to-purple-600', badge: 'Most Popular' },
  { icon: Zap, title: 'Smart MCQ Engine', desc: '50,000+ verified MCQs with adaptive difficulty. Jitna practice karo, utna hi improve karo.', color: 'from-blue-500 to-indigo-600', badge: '50K+ Questions' },
  { icon: FileText, title: 'Past Papers', desc: '20 saal ke past papers ek jagah. Board-wise, year-wise filter karke practice karo.', color: 'from-green-500 to-emerald-600', badge: '20 Years' },
  { icon: BookOpen, title: 'Smart Flashcards', desc: 'AI-powered spaced repetition. Sirf woh cards dobara dikhaaye jaate hain jo tum nahi jaante.', color: 'from-amber-500 to-orange-600', badge: 'Spaced Repetition' },
  { icon: BarChart3, title: 'Progress Analytics', desc: 'Har subject mein tumhara performance track karo. Weak areas identify karo aur improve karo.', color: 'from-pink-500 to-rose-600', badge: 'AI Analytics' },
  { icon: Trophy, title: 'Leaderboard & XP', desc: 'Dosto se compete karo, XP earn karo, achievements unlock karo. Study ko game banao!', color: 'from-cyan-500 to-sky-600', badge: 'Gamification' },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Sab Kuch Ek Jagah <span className="gradient-text">ilm AI</span> Mein</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Pakistani students ke liye specially designed features jo board exams ki tayari ko asaan banate hain.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, scale: 1.01 }} className="glass rounded-2xl p-6 border border-border/50 hover:border-violet-500/30 transition-all duration-300 group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <div className="inline-block bg-violet-500/10 text-violet-400 text-xs px-2 py-1 rounded-full mb-3">{feature.badge}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
