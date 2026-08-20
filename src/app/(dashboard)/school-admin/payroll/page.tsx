'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, CheckCircle } from 'lucide-react';

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground mt-1">Manage teacher and staff salaries</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Process Payroll
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Salaries (Monthly)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. 3.8M</div>
            <p className="text-xs text-muted-foreground">48 employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. 3.8M</div>
            <p className="text-xs text-muted-foreground">100% processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Sep 30</div>
            <p className="text-xs text-muted-foreground">10 days remaining</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payroll Records</CardTitle>
          <CardDescription>Latest salary payment processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-semibold">Employee</th>
                  <th className="p-3 text-left font-semibold">Position</th>
                  <th className="p-3 text-left font-semibold">Salary</th>
                  <th className="p-3 text-left font-semibold">Deductions</th>
                  <th className="p-3 text-left font-semibold">Net Pay</th>
                  <th className="p-3 text-left font-semibold">Status</th>
                  <th className="p-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">Teacher {i}</td>
                    <td className="p-3">Senior Teacher</td>
                    <td className="p-3 text-right">Rs. 80,000</td>
                    <td className="p-3 text-right">Rs. 8,000</td>
                    <td className="p-3 font-semibold text-right">Rs. 72,000</td>
                    <td className="p-3">
                      <Badge variant="outline">Paid</Badge>
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm">View</Button>
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
