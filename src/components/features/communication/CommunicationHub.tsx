'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Phone, Plus, Search, Users, X, UserRound, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DirectMessageThread } from '@/components/ui/DirectMessageThread';
import { CallButton } from '@/components/features/calling/CallButton';
import { GroupMessageThread } from './GroupMessageThread';
import { toast } from 'sonner';

type Contact = { id: string; name: string; avatarUrl: string | null; email?: string | null; role: string };
type Group = { id: string; name: string; group_type: 'class' | 'custom'; section_id?: string | null };

function Avatar({ name, url }: { name: string; url?: string | null }) {
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
    {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}
  </div>;
}

export function CommunicationHub({ organizationId, currentUserId, currentRole }: { organizationId: string; currentUserId: string; currentRole: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tab, setTab] = useState<'people' | 'groups'>('people');
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [savingGroup, setSavingGroup] = useState(false);

  const load = async () => {
    const [peopleRes, groupsRes] = await Promise.all([
      fetch('/api/school-communication/contacts', { cache: 'no-store' }),
      fetch('/api/school-communication/groups', { cache: 'no-store' }),
    ]);
    const peopleJson = await peopleRes.json();
    const groupsJson = await groupsRes.json();
    if (peopleRes.ok) setContacts(peopleJson.contacts || []);
    if (groupsRes.ok) setGroups(groupsJson.groups || []);
  };

  useEffect(() => { load(); }, []);

  const filteredContacts = useMemo(() => contacts.filter((item) => `${item.name} ${item.role} ${item.email || ''}`.toLowerCase().includes(search.toLowerCase())), [contacts, search]);
  const filteredGroups = useMemo(() => groups.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())), [groups, search]);

  const openContact = async (contact: Contact) => {
    setSelectedGroup(null);
    setSelectedContact(contact);
    setSelectedConversationId(null);
    const res = await fetch('/api/school-communication/conversation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ otherProfileId: contact.id }),
    });
    const json = await res.json();
    if (res.ok) setSelectedConversationId(json.conversation?.id || null);
    else toast.error(json.error || 'Conversation could not be opened.');
  };

  const createGroup = async () => {
    if (groupName.trim().length < 2 || savingGroup) return;
    setSavingGroup(true);
    try {
      const res = await fetch('/api/school-communication/groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim(), memberIds: selectedMembers }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || 'Group could not be created.');
        return;
      }
      if (json.group) {
        setGroups((prev) => [...prev, json.group]);
        setShowCreateGroup(false); setGroupName(''); setSelectedMembers([]); setTab('groups'); setSelectedGroup(json.group);
        toast.success('Group created.');
      }
    } finally {
      setSavingGroup(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card/70 shadow-sm">
      <div className="border-b bg-background/60 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-lg font-bold">School Communication</p><p className="text-muted-foreground text-xs">Chat, calls and class groups in one place</p></div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCreateGroup(true)} className="gap-2"><Plus className="h-4 w-4" /> New group</Button>
          </div>
        </div>
      </div>
      <div className="grid min-h-[calc(100dvh-13rem)] xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 bg-background/30 p-3 sm:p-4">
          {!selectedContact && !selectedGroup ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400"><MessageCircle className="h-7 w-7" /></div>
              <h2 className="text-lg font-semibold">Pick a conversation</h2><p className="text-muted-foreground mt-1 max-w-sm text-sm">Choose a person or group from the right side to start chatting. Calls use the same contacts.</p>
            </div>
          ) : selectedGroup ? (
            <GroupMessageThread groupId={selectedGroup.id} currentUserId={currentUserId} groupName={selectedGroup.name} />
          ) : selectedContact && selectedConversationId ? (
            <div className="h-[calc(100dvh-14rem)] min-h-[420px] overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center gap-3 border-b px-4 py-3"><Avatar name={selectedContact.name} url={selectedContact.avatarUrl} /><div className="min-w-0"><p className="truncate font-semibold">{selectedContact.name}</p><p className="text-muted-foreground text-xs capitalize">{selectedContact.role}</p></div></div>
              <DirectMessageThread conversationId={selectedConversationId} currentUserId={currentUserId} onDeleted={() => { setSelectedContact(null); setSelectedConversationId(null); }} />
            </div>
          ) : <div className="flex min-h-[520px] items-center justify-center text-sm text-muted-foreground">Opening conversation…</div>}
        </section>

        <aside className="border-t xl:border-l xl:border-t-0 bg-background/70">
          <div className="p-3 sm:p-4">
            <div className="mb-3 flex rounded-xl border bg-muted/30 p-1">
              <button className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${tab === 'people' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setTab('people')}>People</button>
              <button className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${tab === 'groups' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setTab('groups')}>Groups</button>
            </div>
            <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === 'people' ? 'Search people…' : 'Search groups…'} className="pl-9" /></div>
            <div className="max-h-[calc(100dvh-18rem)] space-y-1 overflow-y-auto pr-1">
              {tab === 'people' ? filteredContacts.map((contact) => (
                <div key={contact.id} className={`flex items-center gap-2 rounded-xl p-2.5 transition ${selectedContact?.id === contact.id ? 'bg-violet-500/10' : 'hover:bg-muted/60'}`}>
                  <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => openContact(contact)}><Avatar name={contact.name} url={contact.avatarUrl} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{contact.name}</span><span className="text-muted-foreground flex items-center gap-1 text-[10px] capitalize"><Badge variant="outline" className="px-1.5 py-0 text-[9px]">{contact.role}</Badge></span></span></button>
                  <div className="flex shrink-0 items-center gap-1"><CallButton institutionType="school" organizationId={organizationId} target={{ userId: contact.id, name: contact.name, avatarUrl: contact.avatarUrl }} /><button onClick={() => openContact(contact)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><MessageCircle className="h-3.5 w-3.5" /></button></div>
                </div>
              )) : filteredGroups.map((group) => (
                <button key={group.id} onClick={() => { setSelectedContact(null); setSelectedConversationId(null); setSelectedGroup(group); }} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${selectedGroup?.id === group.id ? 'bg-violet-500/10' : 'hover:bg-muted/60'}`}><span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">{group.group_type === 'class' ? <Users className="h-4 w-4" /> : <Layers3 className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{group.name}</span><span className="text-muted-foreground text-[10px]">{group.group_type === 'class' ? 'School class group' : 'Custom group'}</span></span></button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {showCreateGroup && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between"><div><h3 className="font-bold">Create group</h3><p className="text-muted-foreground text-xs">Students can create their own groups too.</p></div><button onClick={() => setShowCreateGroup(false)}><X className="h-5 w-5" /></button></div>
            <Input className="mt-4" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" />
            <div className="mt-4 max-h-60 space-y-1 overflow-y-auto rounded-xl border p-2">
              {contacts.map((contact) => <label key={contact.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted"><input type="checkbox" checked={selectedMembers.includes(contact.id)} onChange={(e) => setSelectedMembers((prev) => e.target.checked ? [...prev, contact.id] : prev.filter((id) => id !== contact.id))} /><Avatar name={contact.name} url={contact.avatarUrl} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{contact.name}</span><span className="text-muted-foreground text-[10px] capitalize">{contact.role}</span></span></label>)}
            </div>
            <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCreateGroup(false)}>Cancel</Button><Button onClick={createGroup} disabled={savingGroup || groupName.trim().length < 2}>Create group</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
