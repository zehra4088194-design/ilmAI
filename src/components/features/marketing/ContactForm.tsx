'use client';

import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getRecaptchaToken } from '@/lib/security/recaptcha-client';

const INITIAL_FORM = {
  name: '',
  email: '',
  subject: '',
  message: '',
  company: '',
};

export function ContactForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof INITIAL_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.message.trim().length < 20) {
      toast.error('Please add a little more detail so we can understand the issue.');
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken('contact_submit');
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptchaToken }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'The message could not be sent.');
      setForm(INITIAL_FORM);
      toast.success('Your message was delivered to ilm AI support.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The message could not be sent.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-border/70 bg-card/50 space-y-5 rounded-2xl border p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-2 block text-sm font-medium">
            Name
          </label>
          <Input
            id="contact-name"
            name="name"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            autoComplete="name"
            maxLength={80}
            required
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            autoComplete="email"
            maxLength={254}
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-subject" className="mb-2 block text-sm font-medium">
          Subject
        </label>
        <Input
          id="contact-subject"
          name="subject"
          value={form.subject}
          onChange={(event) => update('subject', event.target.value)}
          placeholder="For example: correction on a study guide"
          maxLength={120}
          required
        />
      </div>
      <div className="absolute -left-[10000px]" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
          value={form.company}
          onChange={(event) => update('company', event.target.value)}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-2 block text-sm font-medium">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          value={form.message}
          onChange={(event) => update('message', event.target.value)}
          placeholder="Include the page URL, exact error, or enough context for us to investigate."
          rows={7}
          minLength={20}
          maxLength={4000}
          required
          className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
        <p className="text-muted-foreground mt-1 text-right text-xs">{form.message.length}/4000</p>
      </div>
      <Button type="submit" variant="gradient" className="w-full sm:w-auto" loading={loading}>
        <Send className="h-4 w-4" /> Send message
      </Button>
      <p className="text-muted-foreground flex items-start gap-2 text-xs leading-5">
        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        If the form is unavailable, email{' '}
        <a href="mailto:ilmai.study1@gmail.com" className="text-violet-300 underline">
          ilmai.study1@gmail.com
        </a>
        .
      </p>
    </form>
  );
}
