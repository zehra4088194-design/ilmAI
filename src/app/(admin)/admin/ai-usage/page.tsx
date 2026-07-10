import { Metadata } from 'next';
import { CheckCircle2, Database, Info, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Admin - AI Usage' };

export default function AdminAiUsagePage() {
  const upstashConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Usage Monitoring</h1>
        <p className="mt-1 text-sm text-muted-foreground">Daily limits Redis keys ke through enforce ho rahe hain.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="mb-1 text-xs text-muted-foreground">Rate Limit Store</p>
            <div className="flex items-center gap-2">
              {upstashConfigured ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <ShieldAlert className="h-5 w-5 text-amber-500" />}
              <p className="text-2xl font-bold">{upstashConfigured ? 'Connected' : 'Local fallback'}</p>
            </div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground mb-1">Tracked Features</p><p className="text-2xl font-bold">4</p><p className="text-xs text-muted-foreground">AI, quiz, OCR, voice</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground mb-1">Key Prefix</p><p className="text-2xl font-bold">ilm-ai</p><p className="text-xs text-muted-foreground">Upstash dashboard mein search karo</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-violet-400" />
            Upstash Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <Badge variant={upstashConfigured ? 'success' : 'warning'}>{upstashConfigured ? 'UPSTASH env connected' : 'UPSTASH env missing'}</Badge>
          <p>
            Agar Upstash console mein commands/storage dikh rahe hain aur yahan Connected hai, to app rate limits Redis se use kar rahi hai.
            Keys daily window ke saath banti hain, example: <code className="rounded bg-muted px-1">ilm-ai:ratelimit:ai_message:userId:date</code>.
          </p>
          <p className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Live total charts ke liye future mein separate usage logging table add karni hogi. Abhi Redis rate-limit counters active hain.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
