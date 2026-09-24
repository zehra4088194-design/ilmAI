'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { AlertCircle, Trash2, Mail, Lock } from 'lucide-react';

export function DeleteAccountFlow({ userEmail, fullName }: { userEmail: string; fullName: string }) {
  const [step, setStep] = useState<'warning' | 'request' | 'confirm'>('warning');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleRequestDeletion = async () => {
    if (!agreed) {
      toast.error('Please confirm that you understand the consequences.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/delete-account/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();

      if (!res.ok || json.status === 'error') {
        toast.error(json.error || 'Failed to request account deletion.');
        setLoading(false);
        return;
      }

      toast.success('Confirmation email sent! Check your inbox for the OTP.');
      setStep('confirm');
    } catch (error) {
      console.error('Error requesting deletion:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP from your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/delete-account/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });

      const json = await res.json();

      if (!res.ok || json.status === 'error') {
        toast.error(json.error || 'Failed to confirm account deletion.');
        setLoading(false);
        return;
      }

      toast.success('Account deleted successfully.');
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Error confirming deletion:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {step === 'warning' && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-6 space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">This action is permanent</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Deleting your account will permanently remove:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Your profile and personal information</li>
                    <li>All study progress and marks</li>
                    <li>Flashcard decks and notes</li>
                    <li>Quiz attempts and game progress</li>
                    <li>Achievement records and streaks</li>
                    <li>Parent links and school/college memberships</li>
                    <li>All conversations and messages</li>
                    <li>Any other associated data</li>
                  </ul>
                  <p className="mt-4 font-medium">
                    This action cannot be undone. Once deleted, your account and data cannot be recovered.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">
                  I understand that deleting my account is permanent and all my data will be lost. I want to proceed with
                  the deletion.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => window.history.back()}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRequestDeletion}
                disabled={!agreed || loading}
                loading={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Request Account Deletion
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'confirm' && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Mail className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Confirmation email sent</h3>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit verification code to <strong>{userEmail}</strong>. Enter it below to confirm your
                  account deletion.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">Verification code</label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="font-mono text-center text-lg tracking-widest"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">This code will expire in 15 minutes.</p>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <div className="flex gap-2">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Make sure no one else can see your screen before entering the code.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('warning')} disabled={loading}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeletion} loading={loading} disabled={otp.length !== 6}>
                Confirm & Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
