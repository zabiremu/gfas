export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

export function formatDocType(docType: string): string {
  return docType
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function getModeIcon(mode: string): string {
  const icons: Record<string, string> = {
    OCEAN: '🚢', AIR: '✈️', INLAND: '🚛'
  };
  return icons[mode] || '📦';
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
