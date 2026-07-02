'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const FAQS = [
  { q: 'StudyVerse bilkul free hai?', a: 'Haan! Free plan mein roz 10 AI messages, 5 quizzes aur 50 flashcards milte hain. Zyada chahiye to Pro ya Elite plan lo.' },
  { q: 'Kaunse boards support kiye jaate hain?', a: 'FBISE, BISE Lahore, BISE Karachi, BISE Rawalpindi, BISE Faisalabad, Aga Khan University aur bahut saare boards support kiye jaate hain.' },
  { q: 'AI Tutor kis language mein jawab deta hai?', a: 'AI Tutor English aur Urdu dono mein jawab de sakta hai. Aap jo language prefer karo usi mein likh sakte ho.' },
  { q: 'Subscription cancel kaise karte hain?', a: 'Kabhi bhi settings se subscription cancel kar sakte ho. Billing period khatam hone tak Pro access rehti hai.' },
  { q: 'Offline study possible hai?', a: 'Elite plan mein offline mode available hai. Notes, flashcards aur kuch content offline download kar sakte ho.' },
  { q: 'MCQ questions kaun verify karta hai?', a: 'Sab MCQs subject expert teachers ne verify kiye hain. Agar koi mistake mile to report karein, hum fix kar denge.' },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Aksar Puche Jaane Wale <span className="gradient-text">Sawaal</span></h2>
        </motion.div>
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="glass rounded-xl border border-border/50 overflow-hidden">
              <button className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                <span className="font-medium">{faq.q}</span>
                <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform shrink-0', openIndex === i && 'rotate-180')} />
              </button>
              {openIndex === i && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
