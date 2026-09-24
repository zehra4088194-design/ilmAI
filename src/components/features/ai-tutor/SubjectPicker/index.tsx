'use client';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getTeacherPersona } from '@/lib/utils/teacher-persona';
import { cn } from '@/lib/utils/cn';

interface SubjectPickerProps {
  subjects: { id: string; name: string }[];
  onSelect: (subject: { id: string; name: string } | null) => void;
}

export function SubjectPicker({ subjects, onSelect }: SubjectPickerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
        <GraduationCap className="w-7 h-7 text-white" />
      </div>
      <h2 className="text-lg font-bold gradient-text mb-1">Which subject would you like to study today?</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Select a subject so the tutor can answer according to your board and syllabus.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
        {subjects.map((subject, i) => {
          const persona = getTeacherPersona(subject.name);
          return (
            <motion.button
              key={subject.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onSelect(subject)}
              className="text-left"
            >
              <Card className="hover:border-violet-500/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-3.5 flex flex-col items-center text-center gap-2">
                  <div className={cn('w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold', persona.gradient)}>
                    {persona.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{subject.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{persona.name}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.button>
          );
        })}
      </div>
      <button onClick={() => onSelect(null)} className="mt-6 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
        Skip and ask a general question
      </button>
    </div>
  );
}
