import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export const metadata: Metadata = { title: 'Admin - Settings' };
export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Settings</h1>
      <Card><CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Platform-wide settings (maintenance mode, feature flags, default subscription limits) yahan manage honge. Environment variables se control hota hai abhi.</p></CardContent>
      </Card>
    </div>
  );
}
