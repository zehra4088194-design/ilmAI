'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
const STATS = [
  { value: 50000, suffix: '+', label: 'Active Students', color: 'text-violet-400' },
  { value: 50000, suffix: '+', label: 'MCQ Questions', color: 'text-blue-400' },
  { value: 98, suffix: '%', label: 'Success Rate', color: 'text-green-400' },
  { value: 24, suffix: '/7', label: 'AI Availability', color: 'text-amber-400' },
];
function Counter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  useEffect(() => {
    if (!isInView) return;
    const duration = 2000; const steps = 60; const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, value]);
  return <span ref={ref}>{count >= 1000 ? `${(count / 1000).toFixed(0)}K` : count}{suffix}</span>;
}
export function StatsSection() {
  return (
    <section className="py-20 border-y border-border/50 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <div className={`text-4xl md:text-5xl font-bold mb-2 ${stat.color}`}><Counter value={stat.value} suffix={stat.suffix} /></div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
