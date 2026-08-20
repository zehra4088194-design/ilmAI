'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, DollarSign, Users, Calendar, BookOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/providers/I18nProvider';

export default function PrincipalSettingsPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/school-admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">School Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your institution's profile and configuration</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="general" className="flex gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Teachers</span>
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="flex gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Curriculum</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Plan</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>School Information</CardTitle>
                <CardDescription>Update your institution's basic details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="school-name">School Name</Label>
                    <Input id="school-name" placeholder="e.g., Iqra Public School" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-code">School Code</Label>
                    <Input id="school-code" placeholder="e.g., IPS-001" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-desc">Description</Label>
                  <Textarea id="school-desc" placeholder="Brief description of your school..." rows={3} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="school-email">Email</Label>
                    <Input id="school-email" type="email" placeholder="admin@school.edu.pk" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-phone">Phone</Label>
                    <Input id="school-phone" placeholder="+92-300-1234567" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-address">Address</Label>
                  <Input id="school-address" placeholder="School street address" />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teachers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Teacher Management</CardTitle>
                <CardDescription>Manage staff members and permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4 text-center text-muted-foreground">
                  <p className="text-sm">Teacher list and management coming soon</p>
                  <p className="text-xs mt-2">View, add, and manage teachers across your institution</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="curriculum" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Curriculum & Subjects</CardTitle>
                <CardDescription>Configure grade levels and subjects offered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4 text-center text-muted-foreground">
                  <p className="text-sm">Curriculum setup coming soon</p>
                  <p className="text-xs mt-2">Define grade levels, subjects, and academic structure</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Academic Calendar</CardTitle>
                <CardDescription>Set academic years, terms, and holidays</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4 text-center text-muted-foreground">
                  <p className="text-sm">Academic calendar configuration coming soon</p>
                  <p className="text-xs mt-2">Define school calendar, terms, and important dates</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Fees</CardTitle>
                <CardDescription>Configure student fees and payment details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4 text-center text-muted-foreground">
                  <p className="text-sm">Fee structure and payment configuration coming soon</p>
                  <p className="text-xs mt-2">Manage tuition fees, bank details, and payment methods</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>School Plan</CardTitle>
                <CardDescription>Manage your institutional subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="rounded-lg border border-violet-500/50 bg-violet-50 p-4 dark:bg-violet-950/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Current Plan: Pro</p>
                        <p className="text-sm text-muted-foreground">$100/month for up to 500 students</p>
                      </div>
                      <Button>Upgrade Plan</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Plan Features</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>✓ Up to 500 students</li>
                      <li>✓ Unlimited teachers</li>
                      <li>✓ Grade recording & transcripts</li>
                      <li>✓ Parent communication</li>
                      <li>✓ Priority support</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
