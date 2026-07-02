import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export const metadata: Metadata = { title: 'Admin - AI Usage' };
export default function AdminAiUsagePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI Usage Monitoring</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground mb-1">Groq Tokens Today</p><p className="text-2xl font-bold">—</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground mb-1">OCR Scans Today</p><p className="text-2xl font-bold">—</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground mb-1">Active Chat Sessions</p><p className="text-2xl font-bold">—</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Note</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Real-time usage metrics ke liye Upstash Redis dashboard ya custom logging table connect karo. Rate limit keys already structured hain lib/rate-limit mein.</p></CardContent>
      </Card>
    </div>
  );
}
