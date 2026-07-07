import { getTeacherPersona } from '@/lib/utils/teacher-persona';
import { cn } from '@/lib/utils/cn';

interface TeacherIdentityCardProps {
  subjectName?: string | null;
  size?: 'sm' | 'md' | 'lg';
  /** Show only the round avatar (e.g. inside a chat bubble row) */
  avatarOnly?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { avatar: 'w-7 h-7 text-[11px]', name: 'text-xs', bio: 'text-[10px]' },
  md: { avatar: 'w-9 h-9 text-xs', name: 'text-sm', bio: 'text-xs' },
  lg: { avatar: 'w-11 h-11 text-sm', name: 'text-sm', bio: 'text-xs' },
};

export function TeacherIdentityCard({ subjectName, size = 'md', avatarOnly = false, className }: TeacherIdentityCardProps) {
  const persona = getTeacherPersona(subjectName);
  const s = SIZE_MAP[size];

  const avatar = (
    <div className={cn('rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shrink-0 shadow-sm', persona.gradient, s.avatar)}>
      {persona.initials}
    </div>
  );

  if (avatarOnly) return avatar;

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {avatar}
      <div className="min-w-0">
        <p className={cn('font-semibold leading-tight truncate', s.name)}>{persona.name}</p>
        <p className={cn('text-muted-foreground leading-tight truncate', s.bio)}>{persona.specialty} · {persona.bio}</p>
      </div>
    </div>
  );
}
