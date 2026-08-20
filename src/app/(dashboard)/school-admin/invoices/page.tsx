'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Download, Plus } from 'lucide-react';

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices & Fees</h1>
          <p className="text-muted-foreground mt-1">Manage student fee invoices and payment tracking</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Generate Invoice
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. 15.7M</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. 13.3M</div>
            <p className="text-xs text-muted-foreground">85% collection rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. 2.4M</div>
            <p className="text-xs text-muted-foreground">32 overdue invoices</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Latest fee invoices issued</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-semibold">Invoice #</th>
                  <th className="p-3 text-left font-semibold">Student</th>
                  <th className="p-3 text-left font-semibold">Class</th>
                  <th className="p-3 text-left font-semibold">Amount</th>
                  <th className="p-3 text-left font-semibold">Status</th>
                  <th className="p-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">INV-2026-{i.toString().padStart(4, '0')}</td>
                    <td className="p-3">Student Name {i}</td>
                    <td className="p-3">Class 9-A</td>
                    <td className="p-3 font-semibold">Rs. 25,000</td>
                    <td className="p-3">
                      <Badge variant={i === 1 ? 'secondary' : 'outline'}>
                        {i === 1 ? 'Pending' : 'Paid'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
