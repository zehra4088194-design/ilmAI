'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, BookOpen } from 'lucide-react';

export default function ClassesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground mt-1">Manage your school's classes and sections</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Class
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {['Class 9-A', 'Class 9-B', 'Class 10-A', 'Class 10-B', 'Class 11-A', 'Class 12-A'].map((cls) => (
          <Card key={cls} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {cls}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">42 students</span>
              </div>
              <div className="text-xs text-muted-foreground">Teacher: Assigned</div>
              <Button variant="outline" size="sm" className="w-full">View Details</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
