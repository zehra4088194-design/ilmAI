'use client';

import { useState } from 'react';
import { CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getRecaptchaToken } from '@/lib/security/recaptcha-client';

type Option = { id: string; name: string };

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export function PublicAdmissionForm({
  organizationId,
  campuses,
  academicYears,
  classes,
}: {
  organizationId: string;
  campuses: Option[];
  academicYears: Option[];
  classes: string[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ number?: string; error?: string }>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult({});
    const formData = new FormData(event.currentTarget);
    try {
      const recaptchaToken = await getRecaptchaToken('school_admission');
      if (recaptchaToken) formData.set('recaptcha_token', recaptchaToken);
    } catch (error) {
      setSubmitting(false);
      setResult({ error: error instanceof Error ? error.message : 'Security verification failed. Please try again.' });
      return;
    }
    const response = await fetch('/api/school/admissions', {
      method: 'POST',
      body: formData,
    });
    const body = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setResult({ error: body.error || 'The application could not be submitted.' });
      return;
    }
    event.currentTarget.reset();
    setResult({ number: body.applicationNumber });
  }

  if (result.number) {
    return (
      <div className="border-border bg-card rounded-lg border p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-4 text-xl font-bold">Application submitted</h2>
        <p className="text-muted-foreground mt-2 text-sm">Keep this application number for follow-up.</p>
        <p className="mt-4 font-mono text-lg font-bold">{result.number}</p>
        <Button className="mt-6" variant="outline" onClick={() => setResult({})}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border-border bg-card rounded-lg border p-4 shadow-sm sm:p-6">
      <input type="hidden" name="organization_id" value={organizationId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">
          Student name
          <Input name="applicant_name" required maxLength={120} />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Date of birth
          <Input name="date_of_birth" type="date" />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Gender
          <select name="gender" className={selectClass}>
            <option value="">Select</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Applying for class
          <select name="applying_for_class" required className={selectClass}>
            <option value="">Select class</option>
            {classes.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {campuses.length > 1 && (
          <label className="space-y-1.5 text-sm font-medium">
            Campus
            <select name="campus_id" className={selectClass}>
              <option value="">Any campus</option>
              {campuses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {academicYears.length > 0 && (
          <label className="space-y-1.5 text-sm font-medium">
            Academic year
            <select name="academic_year_id" className={selectClass}>
              <option value="">Current intake</option>
              {academicYears.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="space-y-1.5 text-sm font-medium">
          Guardian name
          <Input name="guardian_name" required maxLength={120} />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Guardian phone
          <Input name="guardian_phone" type="tel" required maxLength={30} />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Guardian email
          <Input name="guardian_email" type="email" maxLength={254} />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Previous school
          <Input name="previous_school" maxLength={160} />
        </label>
        <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
          Notes
          <textarea
            name="notes"
            maxLength={1000}
            rows={3}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <label className="border-border bg-muted/30 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 sm:col-span-2">
          <FileUp className="text-muted-foreground h-5 w-5" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Supporting documents</span>
            <span className="text-muted-foreground block text-xs">Up to 3 PDF, JPG, or PNG files; 5 MB each.</span>
          </span>
          <input
            name="documents"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            multiple
            className="max-w-44 text-xs"
          />
        </label>
      </div>
      {result.error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {result.error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="mt-5 w-full sm:w-auto">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit application
      </Button>
    </form>
  );
}
