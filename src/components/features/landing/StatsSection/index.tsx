'use client';

import { motion } from 'framer-motion';

const STATS = [
  { value: '50K+', label: 'Practice Questions', color: 'text-violet-400' },
  { value: '24/7', label: 'AI Tutor Availability', color: 'text-blue-400' },
  { value: '3', label: 'Study Levels: School to University', color: 'text-green-400' },
  { value: '6+', label: 'AI Study Tools', color: 'text-amber-400' },
];

export function StatsSection() {
  return (
    <section className="border-y border-border/50 bg-muted/20 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="rounded-2xl border border-border/60 bg-background/70 p-5 text-center shadow-sm"
            >
              <div className={`mb-2 text-3xl font-bold md:text-4xl ${stat.color}`}>{stat.value}</div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
