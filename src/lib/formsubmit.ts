import { getSiteUrl } from '@/lib/utils/siteUrl';

// Shared by every server-side formsubmit.co relay (resource-feedback, suggestions,
// payments/confirm-proof). Two things a plain fetch() gets wrong, both silent:
//
// 1. formsubmit.co's ajax endpoint refuses requests with no browser-like Referer — a bare
//    server-to-server POST gets "Make sure you open this page through a web server..." back
//    with HTTP 200, so `response.ok` alone never catches it. Always send a Referer.
// 2. Even with a valid Referer, formsubmit.co still returns HTTP 200 for a REJECTED submission
//    (e.g. `{"success":"false","message":"This form needs Activation..."}` the first time a new
//    destination address is used) — you have to read `success` out of the body, not the status.
export async function postToFormsubmit(email: string, body: FormData | Record<string, string>): Promise<void> {
  const isFormData = body instanceof FormData;
  const response = await fetch(`https://formsubmit.co/ajax/${email}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Referer: getSiteUrl(),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: isFormData ? body : JSON.stringify(body),
  });

  const data: unknown = await response.json().catch(() => ({}));
  const success = (data as { success?: string | boolean })?.success;
  const ok = response.ok && success !== false && success !== 'false';
  if (!ok) {
    const message = (data as { message?: string })?.message;
    throw new Error(message || `formsubmit responded ${response.status}`);
  }
}
