'use client';

import { motion } from 'framer-motion';
import { BookOpenCheck, Brain, CalendarCheck2, FileQuestion, GraduationCap, ScanText } from 'lucide-react';

const WORKFLOWS = [
  {
    icon: BookOpenCheck,
    title: 'Board-exam revision',
    text: 'Choose the exact subject and chapter, review the resource, then complete questions and record weak areas.',
  },
  {
    icon: Brain,
    title: 'A difficult concept',
    text: 'Ask for a level-appropriate explanation, request an example, and finish with a question answered without help.',
  },
  {
    icon: FileQuestion,
    title: 'Past-paper practice',
    text: 'Move from topic questions to mixed sections and timed papers instead of reading answer keys passively.',
  },
  {
    icon: CalendarCheck2,
    title: 'A realistic study week',
    text: 'Set a small number of outcomes, schedule focused blocks, and keep catch-up time for work that runs late.',
  },
  {
    icon: ScanText,
    title: 'Printed or handwritten work',
    text: 'Scan a clear page, inspect the extracted text, and use AI feedback as a starting point that you verify.',
  },
  {
    icon: GraduationCap,
    title: 'University preparation',
    text: 'Plan an assignment, practise a viva, or organise sources while keeping academic-integrity rules in view.',
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-muted/20 overflow-hidden py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <p className="mb-3 text-sm font-semibold text-violet-300">Practical workflows</p>
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Start with a study task, not a promise</h2>
          <p className="text-muted-foreground leading-7">
            ilm AI is designed around repeatable learning actions. Results still depend on the learner’s practice,
            verification, consistency, and course requirements.
          </p>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {WORKFLOWS.map((workflow, index) => (
            <motion.article
              key={workflow.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="border-border/60 bg-background/70 rounded-2xl border p-6"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <workflow.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{workflow.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">{workflow.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
