import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveRequiredPhone } from './actions';

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export default async function RequiredPhonePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const params = await searchParams;
  const next = safeNext(params.next);
  const errorMessage =
    params.error === 'invalid'
      ? 'Enter a valid phone number, including the country code when needed.'
      : params.error === 'save'
        ? 'We could not save your phone number. Please try again.'
        : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-lg sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold text-violet-500">ilm AI</p>
          <h1 className="mt-2 text-2xl font-black">Phone number required</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Add your phone number before entering ilm AI. It is used for the contact directory and device dialing.
          </p>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <form action={saveRequiredPhone} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="required-phone" className="mb-2 block text-sm font-semibold">
              Mobile phone number
            </label>
            <input
              id="required-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+92 300 1234567"
              required
              minLength={7}
              maxLength={24}
              className="border-input bg-background h-11 w-full rounded-xl border px-3 text-sm outline-none transition focus:ring-2 focus:ring-violet-500/30"
            />
            <p className="text-muted-foreground mt-2 text-xs">
              Use a number that can be dialed from your device. Country code is recommended.
            </p>
          </div>
          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-full rounded-xl px-4 text-sm font-semibold transition"
          >
            Save & Continue
          </button>
        </form>
      </section>
    </main>
  );
}
