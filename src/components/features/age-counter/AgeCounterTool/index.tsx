'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  totalMonths: number;
  totalHours: number;
  nextBirthdayIn: number;
}

function calculateAge(birthDateStr: string, asOfStr?: string): AgeResult | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  const asOf = asOfStr ? new Date(asOfStr) : new Date();
  if (isNaN(birth.getTime()) || birth > asOf) return null;

  let years = asOf.getFullYear() - birth.getFullYear();
  let months = asOf.getMonth() - birth.getMonth();
  let days = asOf.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(asOf.getFullYear(), asOf.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const msDiff = asOf.getTime() - birth.getTime();
  const totalDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = years * 12 + months;
  const totalHours = Math.floor(msDiff / (1000 * 60 * 60));

  const nextBirthday = new Date(asOf.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBirthday < asOf) nextBirthday.setFullYear(asOf.getFullYear() + 1);
  const nextBirthdayIn = Math.ceil((nextBirthday.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24));

  return { years, months, days, totalDays, totalWeeks, totalMonths, totalHours, nextBirthdayIn };
}

export function AgeCounterTool() {
  const [birthDate, setBirthDate] = useState('');
  const [asOfDate, setAsOfDate] = useState('');
  const [result, setResult] = useState<AgeResult | null>(null);

  const handleCalculate = () => {
    setResult(calculateAge(birthDate, asOfDate || undefined));
  };

  const handleReset = () => {
    setBirthDate('');
    setAsOfDate('');
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Date of Birth</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().split('T')[0]}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">As Of Date (optional)</label>
              <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} placeholder="Aaj ki tareekh"
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <Button variant="gradient" size="lg" className="w-full sm:w-auto" onClick={handleCalculate}>
            <Cake className="w-4 h-4" />Age Nikalo
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="text-center glass rounded-2xl p-8 border border-border/50">
              <p className="text-5xl sm:text-6xl font-bold gradient-text">{result.years}</p>
              <p className="text-muted-foreground mt-2">saal, {result.months} mahine, {result.days} din</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-violet-400">{result.totalMonths}</p>
                <p className="text-xs text-muted-foreground">Total Months</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-blue-400">{result.totalWeeks}</p>
                <p className="text-xs text-muted-foreground">Total Weeks</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-green-400">{result.totalDays}</p>
                <p className="text-xs text-muted-foreground">Total Days</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-amber-400">{result.totalHours.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
              <Calendar className="w-5 h-5 text-violet-400 shrink-0" />
              <p className="text-sm">Your next birthday is in <strong>{result.nextBirthdayIn} days</strong> 🎉</p>
            </div>

            <Button variant="outline" onClick={handleReset}>Reset</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
