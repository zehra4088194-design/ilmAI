'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground mt-1">Manage student enrollments and records</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Enroll Student
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>Search and view all enrolled students</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search students..." className="pl-8" />
            </div>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-semibold">Name</th>
                  <th className="p-3 text-left font-semibold">Roll #</th>
                  <th className="p-3 text-left font-semibold">Class</th>
                  <th className="p-3 text-left font-semibold">Email</th>
                  <th className="p-3 text-left font-semibold">Status</th>
                  <th className="p-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">Student Name {i}</td>
                    <td className="p-3">{`9-${i}`}</td>
                    <td className="p-3">Class 9-A</td>
                    <td className="p-3 text-muted-foreground">student{i}@school.local</td>
                    <td className="p-3">
                      <Badge variant="outline">Active</Badge>
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm">View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground text-center py-4">Showing 5 of 1,247 students</p>
        </CardContent>
      </Card>
    </div>
  );
}
