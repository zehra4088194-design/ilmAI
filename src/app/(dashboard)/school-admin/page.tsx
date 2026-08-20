'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, FileText, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function PrincipalDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">School Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back. Here's your institution overview.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground">5 pending approvals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. 2.4M</div>
            <p className="text-xs text-muted-foreground">32 students pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Button asChild variant="outline" className="justify-start">
            <Link href="/school-admin/teachers">
              <Users className="h-4 w-4 mr-2" />
              Manage Teachers
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/school-admin/students">
              <Users className="h-4 w-4 mr-2" />
              View Students
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/school-admin/classes">
              <BookOpen className="h-4 w-4 mr-2" />
              Manage Classes
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/school-admin/invoices">
              <FileText className="h-4 w-4 mr-2" />
              View Invoices
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/school-admin/payroll">
              <DollarSign className="h-4 w-4 mr-2" />
              Manage Payroll
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/school-admin/settings">
              <Calendar className="h-4 w-4 mr-2" />
              School Settings
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest events in your school</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">5 new student registrations</p>
              <Badge variant="secondary">Today</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Teacher attendance: 94.3%</p>
              <Badge variant="secondary">This week</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Exam schedule updated</p>
              <Badge variant="secondary">2 days ago</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">New fee payment received</p>
              <Badge variant="secondary">3 days ago</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
