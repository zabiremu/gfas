import type { ShipmentStatus } from '@/types';

const STYLES: Record<
  ShipmentStatus,
  { bg: string; color: string; strike?: boolean }
> = {
  DRAFT: { bg: '#F3F4F6', color: '#4B5563' },
  BOOKED: { bg: '#DCEEFF', color: '#0A3070' },
  IN_TRANSIT: { bg: '#D8F5EC', color: '#055040' },
  CUSTOMS_HOLD: { bg: '#FEE2E2', color: '#991B1B' },
  ARRIVED: { bg: '#EDE8FD', color: '#3D1A80' },
  DELIVERED: { bg: '#F0FDF4', color: '#14532D' },
  CANCELLED: { bg: '#F3F4F6', color: '#9CA3AF', strike: true },
};

export default function StatusBadge({ status }: { status: ShipmentStatus }) {
  const style = STYLES[status] ?? STYLES.DRAFT;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        style.strike ? 'line-through' : ''
      }`}
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
