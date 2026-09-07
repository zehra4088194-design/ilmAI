'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const HIGHLIGHTS = [
  'One dashboard for AI Tutor, notes, tests, and progress',
  'Continue exactly where you left off, subject by subject',
  'Clear, calm progress tracking instead of a wall of numbers',
];

export function ProductShowcaseSection() {
  return (
    <section className="border-border/50 border-y py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <h2 className="text-3xl font-bold md:text-4xl">
              Everything you need, <span className="gradient-text">one screen away</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-md leading-7">
              Open ilm AI and pick up your learning exactly where you stopped — the AI Tutor, your notes, a scheduled
              test, and your progress, all in one home screen.
            </p>
            <ul className="mt-6 space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="glass overflow-hidden rounded-2xl border border-violet-500/20 shadow-2xl shadow-violet-500/10">
              <Image
                src="/marketing/lms-dashboard.png"
                alt="ilm AI dashboard showing the AI Tutor, subjects in progress, and a weekly progress ring"
                width={1680}
                height={945}
                className="h-auto w-full"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
