import { GoogleAuth, type JWTInput } from 'google-auth-library';
import { createAdminClient } from '@/lib/supabase/server';

type PushPayload = {
  userId: string;
  title: string;
  message: string;
  link?: string | null;
};

function getFirebaseAuth() {
  const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  let credentials: (JWTInput & { project_id?: string }) | undefined;

  if (encodedServiceAccount) {
    const parsed = JSON.parse(Buffer.from(encodedServiceAccount, 'base64').toString('utf8')) as Record<string, unknown>;
    if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') {
      throw new Error('Firebase service account JSON is invalid.');
    }
    credentials = parsed as JWTInput & { project_id?: string };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || credentials?.project_id;
  if (!projectId) return null;
  return {
    projectId,
    auth: new GoogleAuth({
      credentials,
      projectId,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    }),
  };
}

function absoluteAppLink(link?: string | null) {
  if (!link) return undefined;
  try {
    return new URL(link, process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL).toString();
  } catch {
    return undefined;
  }
}

export async function sendPushNotification(payload: PushPayload) {
  try {
    const firebase = getFirebaseAuth();
    if (!firebase) return { skipped: true as const };

    const admin = (await createAdminClient()) as any;
    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('token')
      .eq('user_id', payload.userId)
      .eq('enabled', true)
      .limit(100);
    if (error || !subscriptions?.length) return { skipped: true as const };

    const link = absoluteAppLink(payload.link);
    const accessToken = await firebase.auth.getAccessToken();
    if (!accessToken) return { skipped: true as const };

    const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(firebase.projectId)}/messages:send`;
    const results: Array<{ ok: boolean; invalid: boolean; token: string }> = [];
    for (let index = 0; index < subscriptions.length; index += 20) {
      const batch = subscriptions.slice(index, index + 20) as Array<{ token: string }>;
      const batchResults = await Promise.all(
        batch.map(async ({ token }) => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: payload.title, body: payload.message },
                data: { link: payload.link || '/dashboard' },
                webpush: link ? { fcm_options: { link } } : undefined,
              },
            }),
            signal: AbortSignal.timeout(10_000),
          });
          const responseText = response.ok ? '' : await response.text();
          return { ok: response.ok, invalid: responseText.includes('UNREGISTERED'), token };
        })
      );
      results.push(...batchResults);
    }

    const invalidTokens = results.filter((result) => result.invalid).map((result) => result.token);
    if (invalidTokens.length) {
      await admin.from('push_subscriptions').delete().in('token', invalidTokens);
    }
    return {
      sent: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
    };
  } catch (error) {
    console.warn('Push notification delivery failed:', error);
    return { skipped: true as const };
  }
}
