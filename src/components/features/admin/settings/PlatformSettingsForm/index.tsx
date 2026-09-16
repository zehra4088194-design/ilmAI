'use client';

import { useState } from 'react';
import { BookOpenCheck, DollarSign, GraduationCap, Mail, Moon, Printer, Presentation, Save, ShieldCheck, Sun, UserRoundCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { normalizePlatformSettings, type PlatformSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

const TIERS: SubscriptionTier[] = ['FREE', 'PRO', 'ELITE'];

const ACCESS_LABELS: Array<[keyof PlatformSettings['subscriptionPlans']['FREE']['access'], string]> = [
  ['pastPapers', 'Past papers access'],
  ['downloadPDF', 'PDF downloads'],
  ['studentChat', 'Student chat'],
  ['liveVoice', 'Live Voice'],
  ['games', 'Live games'],
  ['restPlaylists', 'Rest playlists'],
  ['parentDashboard', 'Parent dashboard'],
  ['advancedParentAnalytics', 'Advanced parent analytics'],
  ['parentReports', 'Weekly parent reports'],
  ['prioritySupport', 'Priority support'],
  ['adsFree', 'Hide ads'],
];

const LIMIT_LABELS: Array<[keyof PlatformSettings['subscriptionPlans']['FREE']['limits'], string]> = [
  ['aiCreditsWeekly', 'Shared AI/week (Free)'],
  ['aiCreditsMonthly', 'Shared AI/month'],
  ['quizDaily', 'Testing/day'],
  ['liveVoiceDaily', 'Live voice/day'],
  ['flashcardsTotal', 'Flashcards total'],
  ['gameMinutesDaily', 'Game minutes/day'],
  ['parentGuardiansMax', 'Max guardians'],
  ['parentAttachmentFilesMonthly', 'Parent files/month'],
  ['parentAttachmentMegabytesMonthly', 'Parent MB/month'],
];

// File summaries/tests used to have their own monthly-count fields here too — removed along with
// AudienceFeatureLimits' fields of the same name, since both tools are fully credit-gated now and
// the counts did nothing. presentationsEnabled renders as a checkbox below, not in this array.
const AUDIENCE_SLIDES_LABEL = 'Slides/presentation';


export function PlatformSettingsForm({ initialSettings }: { initialSettings: PlatformSettings }) {