'use client';
import { motion } from 'framer-motion';
import { BOARDS } from '@/lib/constants';
const BOARD_COLORS = ['from-violet-500 to-purple-600', 'from-blue-500 to-indigo-600', 'from-green-500 to-emerald-600', 'from-amber-500 to-orange-600', 'from-pink-500 to-rose-600', 'from-cyan-500 to-sky-600', 'from-red-500 to-pink-600'];
export function BoardsSection() {
  return (
    <section id="boards" className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Select Your <span className="gradient-text">Education Board</span></h2>
          <p className="text-muted-foreground">Support for all major education boards in Pakistan</p>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {BOARDS.map((board, i) => (
            <motion.div key={board.value} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4, scale: 1.03 }} className="glass rounded-2xl p-5 border border-border/50 hover:border-violet-500/30 transition-all duration-300 cursor-pointer text-center">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${BOARD_COLORS[i % BOARD_COLORS.length]} flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                <span className="text-white font-bold text-sm">{board.value.slice(0, 2)}</span>
              </div>
              <p className="font-semibold text-sm">{board.label}</p>
              {board.province && <p className="text-xs text-muted-foreground mt-1">{board.province}</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
