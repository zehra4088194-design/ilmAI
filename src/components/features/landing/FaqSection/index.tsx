'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const FAQS = [
  { q: 'Is ilm AI free?', a: 'Yes. The Free plan includes notes and reading mode, 10 side-chat messages per day, and a 3-use daily preview of AI tools. Upgrade to Pro or Elite for more access.' },
  { q: 'Which boards are supported?', a: 'ilm AI supports FBISE, BISE Lahore, BISE Karachi, BISE Rawalpindi, BISE Faisalabad, Aga Khan University, and many other boards.' },
  { q: 'Which languages does the AI Tutor support?', a: 'The AI Tutor can respond in English and Urdu. You can write in the language you prefer.' },
  { q: 'How do I cancel a subscription?', a: 'You can cancel your subscription from Settings at any time. Pro access remains active until the current billing period ends.' },
  { q: 'Is offline study available?', a: 'Offline mode is available on the Elite plan. You can download notes, flashcards, and eligible content for offline use.' },
  { q: 'Who verifies the MCQ questions?', a: 'Subject-specialist teachers verify all MCQs. Report any issue and our team will review it.' },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked <span className="gradient-text">Questions</span></h2>
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
