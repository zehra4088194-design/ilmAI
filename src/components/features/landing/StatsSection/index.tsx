'use client';

import { motion } from 'framer-motion';

const STATS = [
  { value: 'On demand', label: 'Explain and practise when you study', color: 'text-violet-400' },
  { value: 'Board-aware', label: 'Level and subject context', color: 'text-blue-400' },
  { value: '3 levels', label: 'School, college, and university', color: 'text-green-400' },
  { value: 'Free start', label: 'Explore before choosing a paid plan', color: 'text-amber-400' },
];

export function StatsSection() {
  return (
    <section className="border-border/50 bg-muted/20 border-y py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="border-border/60 bg-background/70 rounded-2xl border p-5 text-center shadow-sm"
            >
              <div className={`mb-2 text-2xl font-bold md:text-3xl ${stat.color}`}>{stat.value}</div>
              <p className="text-muted-foreground text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
