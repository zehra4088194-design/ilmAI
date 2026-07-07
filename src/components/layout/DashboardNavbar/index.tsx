'use client';
import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export function DashboardNavbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 border-b border-border bg-background/80 backdrop-blur-md z-30 flex items-center px-4 md:px-6 gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Search subjects, chapters..." className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* XP Display */}
        {user && (
          <Badge variant="outline" className="hidden md:flex items-center gap-1 border-violet-500/30 text-violet-400">
            ⚡ {user.xp.toLocaleString()} XP
          </Badge>
        )}
        {/* Language */}
        <LanguageSwitcher />
        {/* Theme */}
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
          {user?.fullName?.[0] || 'S'}
        </div>
      </div>
    </header>
  );
}
