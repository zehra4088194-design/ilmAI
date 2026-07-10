'use client';

import { useState } from 'react';
import { BookOpen, FileText, NotebookTabs, PlayCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LecturesTab } from './LecturesTab';
import { LibraryTab } from './LibraryTab';
import { PastPapersTab } from './PastPapersTab';

type ResourceTab = 'lectures' | 'library' | 'past-papers';

export function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<ResourceTab>('lectures');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lectures, text books, notes, aur past papers manage karein - class-wise sab yahan se.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ResourceTab)} className="w-full">
        <TabsList>
          <TabsTrigger value="lectures" className="gap-2">
            <PlayCircle className="h-4 w-4" />
            Lectures
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <NotebookTabs className="h-4 w-4" />
            Text Books & Notes
          </TabsTrigger>
          <TabsTrigger value="past-papers" className="gap-2">
            <FileText className="h-4 w-4" />
            Past Papers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lectures" className="mt-4">
          <LecturesTab />
        </TabsContent>
        <TabsContent value="library" className="mt-4">
          <LibraryTab />
        </TabsContent>
        <TabsContent value="past-papers" className="mt-4">
          <PastPapersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
