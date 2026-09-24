export const formatNumber = (n: number): string => new Intl.NumberFormat('en-PK').format(n);
export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};
export const formatRelativeTime = (date: string | Date): string => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-PK');
};
export const formatScore = (correct: number, total: number): string =>
  total === 0 ? '0%' : `${Math.round((correct / total) * 100)}%`;
export const formatXP = (xp: number): string => {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K XP`;
  return `${xp} XP`;
};
export const truncate = (str: string, length: number): string =>
  str.length > length ? str.slice(0, length) + '...' : str;
