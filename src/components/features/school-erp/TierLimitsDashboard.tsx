'use client';

import { useState } from 'react';
import { Users, UserPlus, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

/**
 * Institution Tier Limits Dashboard
 * Shows current usage (students, teachers) vs plan limits,
 * and allows purchasing additional teacher slots at Rs:100/teacher.
 */
export function TierLimitsDashboard({
  organizationId,
  currentStudents,
  maxStudents,
  currentTeachers,
  maxTeachers,
  billingStatus,
  monthlyPricePkr,
  onLimitsUpdated,
}: {
  organizationId: string;
  currentStudents: number;
  maxStudents: number;
  currentTeachers: number;
  maxTeachers: number;
  billingStatus: string;
  monthlyPricePkr: number;
  onLimitsUpdated?: () => void;
}) {
  const [extraTeachers, setExtraTeachers] = useState(0);
  const [loading, setLoading] = useState(false);

  const studentPercent = maxStudents > 0 ? (currentStudents / maxStudents) * 100 : 0;
  const teacherPercent = maxTeachers > 0 ? (currentTeachers / maxTeachers) * 100 : 0;

  const extraTeacherCost = extraTeachers * 100; // Rs:100 per teacher

  const handlePurchaseExtra = async () => {
    if (extraTeachers <= 0) {
      toast.error('Please enter number of extra teachers');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/school/purchase-extra-teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          extraCount: extraTeachers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to purchase extra teachers');
      }

      toast.success(`Successfully added ${extraTeachers} extra teacher slot(s)!`);
      setExtraTeachers(0);
      onLimitsUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-destructive';
    if (percent >= 75) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getUsageBarColor = (percent: number) => {
    if (percent >= 90) return 'bg-destructive';
    if (percent >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Plan & Usage Limits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant={billingStatus === 'active' ? 'default' : billingStatus === 'trial' ? 'secondary' : 'destructive'}
          >
            {billingStatus === 'active' && <CheckCircle className="mr-1 h-3 w-3" />}
            {billingStatus === 'trial' && <TrendingUp className="mr-1 h-3 w-3" />}
            {billingStatus.charAt(0).toUpperCase() + billingStatus.slice(1)}
          </Badge>
          {monthlyPricePkr > 0 && (
            <span className="text-muted-foreground text-sm">
              PKR {monthlyPricePkr.toLocaleString()}/mo
            </span>
          )}
        </div>

        {/* Students Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Students
            </span>
            <span className={`text-sm font-semibold ${getUsageColor(studentPercent)}`}>
              {currentStudents} / {maxStudents}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${getUsageBarColor(studentPercent)}`}
              style={{ width: `${Math.min(studentPercent, 100)}%` }}
            />
          </div>
          {studentPercent >= 90 && (
            <p className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Approaching student limit!
            </p>
          )}
        </div>

        {/* Teachers Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <UserPlus className="h-4 w-4" />
              Teachers
            </span>
            <span className={`text-sm font-semibold ${getUsageColor(teacherPercent)}`}>
              {currentTeachers} / {maxTeachers}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${getUsageBarColor(teacherPercent)}`}
              style={{ width: `${Math.min(teacherPercent, 100)}%` }}
            />
          </div>
          {teacherPercent >= 90 && (
            <p className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Approaching teacher limit!
            </p>
          )}
        </div>

        {/* Purchase Extra Teachers */}
        {billingStatus !== 'suspended' && billingStatus !== 'cancelled' && (
          <div className="border-border rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Extra Teacher Slots
            </h3>
            <p className="text-muted-foreground text-xs">
              Each extra teacher slot costs <span className="font-semibold text-foreground">PKR 100/month</span>.
              Enter how many extra slots you need:
            </p>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={100}
                value={extraTeachers || ''}
                onChange={(e) => setExtraTeachers(Number(e.target.value))}
                placeholder="Number of extra teachers"
                className="max-w-32"
              />
              {extraTeachers > 0 && (
                <span className="text-sm font-medium">
                  Cost: PKR {extraTeacherCost.toLocaleString()}/mo
                </span>
              )}
            </div>
            <Button
              onClick={handlePurchaseExtra}
              disabled={loading || extraTeachers <= 0}
              className="w-full"
              size="sm"
            >
              {loading ? 'Processing...' : `Purchase ${extraTeachers || '#'} Extra Slot(s)`}
            </Button>
            <p className="text-muted-foreground text-[11px]">
              Payment will be added to your next invoice or charged immediately via JazzCash/Easypaisa.
            </p>
          </div>
        )}

        {/* Current Limits Summary */}
        <div className="text-muted-foreground border-border rounded-lg border p-3 text-xs space-y-1">
          <p><span className="font-medium">Current Plan:</span> {maxStudents} students, {maxTeachers} teachers max</p>
          <p><span className="font-medium">Storage:</span> 10 GB included</p>
          {extraTeachers > 0 && (
            <p className="text-emerald-600 font-medium">
              +{extraTeachers} extra teacher slot(s) purchased
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
