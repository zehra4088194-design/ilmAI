'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { GRADE_LEVELS, BOARDS } from '@/lib/constants';
import { toast } from 'sonner';
import { User, Bell, Shield, Palette, Users } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'parent-link', label: 'Parent Link', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export function SettingsTabs({ profile }: { profile: any }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [board, setBoard] = useState(profile?.board || '');
  const [gradeLevel, setGradeLevel] = useState(profile?.grade_level || '');
  const [saving, setSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [linking, setLinking] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, board, grade_level: gradeLevel, updated_at: new Date().toISOString() }).eq('id', profile.id);
    if (error) toast.error(error.message); else toast.success('Profile update ho gaya!');
    setSaving(false);
  };

  const handleLinkParent = async () => {
    if (!inviteCode.trim()) { toast.error('Invite code likho'); return; }
    setLinking(true);
    try {
      const res = await fetch('/api/parent/accept-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      toast.success(json.message);
      setInviteCode('');
    } catch { toast.error('Kuch ghalat ho gaya'); }
    finally { setLinking(false); }
  };

  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-6">
      <div className="space-y-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', activeTab === tab.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50')}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1.5 block">Full Name</label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Board</label>
                <select value={board} onChange={e => setBoard(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Select board</option>
                  {BOARDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium mb-1.5 block">Grade Level</label>
                <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Select grade</option>
                  {GRADE_LEVELS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <Button variant="gradient" onClick={handleSave} loading={saving}>Save Changes</Button>
            </div>
          )}
          {activeTab === 'parent-link' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2"><Users className="w-4 h-4 text-violet-400" />Parent Se Link Karo</h3>
                <p className="text-sm text-muted-foreground mb-4">Apne parent se invite code lo aur yahan enter karo — wo tumhari progress dekh sakenge.</p>
              </div>
              <div className="flex gap-2">
                <Input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="e.g. SV-A1B2C3" className="font-mono" />
                <Button variant="gradient" onClick={handleLinkParent} loading={linking}>Link Karo</Button>
              </div>
              <p className="text-xs text-muted-foreground">Parent apne dashboard se "Generate Invite Code" pe click kar ke ye code bana sakte hain.</p>
            </div>
          )}
          {activeTab === 'notifications' && <p className="text-sm text-muted-foreground">Notification preferences jald aayengi.</p>}
          {activeTab === 'security' && <p className="text-sm text-muted-foreground">Password change aur 2FA settings jald aayengi.</p>}
          {activeTab === 'appearance' && <p className="text-sm text-muted-foreground">Theme settings navbar mein available hain (sun/moon icon).</p>}
        </CardContent>
      </Card>
    </div>
  );
}
