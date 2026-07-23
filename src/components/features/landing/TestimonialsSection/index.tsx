'use client';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  { name: 'Ahmed Ali', board: 'FBISE', grade: 'Grade 10', score: '95%', text: 'ilm AI made physics much clearer for me. The AI Tutor is available 24/7, and MCQ practice built my confidence.', avatar: 'AA' },
  { name: 'Fatima Khan', board: 'BISE Lahore', grade: 'Grade 12', score: '980/1100', text: 'I earned an A+ in Chemistry with help from ilm AI. The past papers and flashcards were especially useful.', avatar: 'FK' },
  { name: 'Usman Raza', board: 'FBISE', grade: 'Grade 11', score: 'Top 5%', text: 'The AI Tutor makes mathematics problems much easier to understand. It is a valuable alternative to expensive tuition.', avatar: 'UR' },
  { name: 'Sara Ahmed', board: 'BISE Karachi', grade: 'Grade 9', score: '88%', text: 'Online study finally feels simple. ilm AI has a clean interface and the AI tools are genuinely helpful.', avatar: 'SA' },
  { name: 'Hassan Malik', board: 'BISE Rawalpindi', grade: 'Grade 12', score: 'A+', text: 'The leaderboard keeps me motivated to compete with friends. Studying has become more engaging.', avatar: 'HM' },
  { name: 'Zara Noor', board: 'BISE Faisalabad', grade: 'Grade 10', score: '92%', text: 'The flashcard system is excellent. Spaced repetition helps me remember Biology definitions with confidence.', avatar: 'ZN' },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-muted/20 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Students Ka <span className="gradient-text">Feedback</span></h2>
          <p className="text-muted-foreground">Join students already learning with ilm AI</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-6 border border-border/50 hover:border-violet-500/30 transition-all duration-300">
              <Quote className="w-6 h-6 text-violet-400 mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">{t.avatar}</div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.board} · {t.grade}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-400 text-sm">{t.score}</p>
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />)}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
