'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Mail, PhoneCall } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Inquiry = {
  id: string;
  institution_name: string;
  institution_type: 'school' | 'college';
  student_count: number;
  plan_tier: 'PRO' | 'ELITE';
  billing_cycle: 'monthly' | 'annual';
  discounted_price_pkr: number;
  contact_name: string | null;
  contact_email: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'closed';
  created_at: string;
};

export function InstitutionInquiryTable() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/institution-inquiries');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Inquiries load nahi hui');
      setInquiries(json.inquiries || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Inquiries load nahi hui');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: Inquiry['status']) => {
    const response = await fetch('/api/admin/institution-inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error || 'Status update nahi hui');
      return;
    }
    setInquiries((items) => items.map((item) => (item.id === id ? { ...item, ...json.inquiry } : item)));
    toast.success('Inquiry status update ho gaya');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="text-primary h-5 w-5" /> School / College Inquiries
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Yahan institutional paid-plan requests aur un ke selected student counts aayenge.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {loading ? (
          <p className="text-muted-foreground p-6 text-sm">Loading...</p>
        ) : inquiries.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">Abhi koi inquiry nahi aayi.</p>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-border border-y text-left">
                <th className="p-4">Institution</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Students</th>
                <th className="p-4">Discounted price</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id} className="border-border/50 border-b align-top">
                  <td className="p-4">
                    <p className="font-semibold">{inquiry.institution_name}</p>
                    <p className="text-muted-foreground text-xs capitalize">{inquiry.institution_type}</p>
                    {inquiry.message && (
                      <p className="text-muted-foreground mt-2 max-w-xs text-xs">{inquiry.message}</p>
                    )}
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">{inquiry.plan_tier}</Badge>
                    <p className="text-muted-foreground mt-1 text-xs">{inquiry.billing_cycle}</p>
                  </td>
                  <td className="p-4 font-medium">{inquiry.student_count.toLocaleString()}</td>
                  <td className="p-4 font-semibold">PKR {inquiry.discounted_price_pkr.toLocaleString()}</td>
                  <td className="text-muted-foreground p-4 text-xs">
                    <p className="flex items-center gap-1">
                      <PhoneCall className="h-3 w-3" />
                      {inquiry.contact_name || '—'}
                    </p>
                    <p className="mt-1 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {inquiry.contact_email || '—'}
                    </p>
                  </td>
                  <td className="p-4">
                    <Select
                      value={inquiry.status}
                      onValueChange={(value) => updateStatus(inquiry.id, value as Inquiry['status'])}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
