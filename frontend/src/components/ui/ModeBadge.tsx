import type { ShipmentMode } from '@/types';

const MODES: Record<
  ShipmentMode,
  { emoji: string; label: string; color: string }
> = {
  OCEAN: { emoji: '🚢', label: 'Ocean', color: '#1559C9' },
  AIR: { emoji: '✈️', label: 'Air', color: '#0A7A5E' },
  INLAND: { emoji: '🚛', label: 'Inland', color: '#A05C00' },
};

export default function ModeBadge({ mode }: { mode: ShipmentMode }) {
  const meta = MODES[mode] ?? { emoji: '📦', label: mode, color: '#4B5563' };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium"
      style={{ color: meta.color }}
    >
      <span>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
