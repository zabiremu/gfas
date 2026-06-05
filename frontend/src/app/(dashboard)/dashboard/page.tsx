'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { DashboardStats, Shipment, ShipmentMode, ShipmentStatus } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isPastEta(eta?: string): boolean {
  if (!eta) return false;
  const d = new Date(eta);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

const MODE_META: Record<ShipmentMode, { emoji: string; label: string }> = {
  OCEAN: { emoji: '🚢', label: 'Ocean' },
  AIR: { emoji: '✈️', label: 'Air' },
  INLAND: { emoji: '🚛', label: 'Inland' },
};

const STATUS_BADGE: Record<ShipmentStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  BOOKED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-teal-100 text-teal-700',
  CUSTOMS_HOLD: 'bg-red-100 text-red-700',
  ARRIVED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500 line-through',
};

// ---------------------------------------------------------------------------
// Static demo alerts
// ---------------------------------------------------------------------------
const ALERTS = [
  { dot: '🔴', text: 'SHP-2025-0003 — Customs hold at Shanghai' },
  { dot: '🟡', text: 'SHP-2025-0005 — Missing shipper party' },
  { dot: '🟡', text: 'SHP-2025-0002 — Awaiting departure confirmation' },
  { dot: '🔵', text: 'SHP-2025-0001 — In transit, ETA Jun 28' },
];

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------
function KpiCard({
  icon,
  value,
  label,
  sub,
  borderColor,
}: {
  icon: string;
  value: number;
  label: string;
  sub: string;
  borderColor: string;
}) {
  return (
    <div
      className="rounded-xl border-l-4 bg-white p-5 shadow-sm"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="flex items-start justify-between">
        <div className="text-3xl font-bold text-[#07172E]">{value}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="mt-1 text-sm font-medium text-gray-700">{label}</div>
      <div className="mt-0.5 text-xs text-gray-400">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="h-80 rounded-xl bg-gray-200" />
        <div className="h-80 rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const firstName = useAuthStore((s) => s.user?.firstName ?? '');

  const { data: stats, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<DashboardStats>('/shipments/dashboard');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#07172E]">Dashboard</h2>
        <p className="mb-6 mt-1 text-sm text-gray-500">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}! Here&apos;s your freight overview.
        </p>
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#07172E]">Dashboard</h2>
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Failed to load dashboard data. Please check that the API is running and
          try again.
        </div>
      </div>
    );
  }

  const recent = stats.recentShipments ?? [];

  return (
    <div>
      {/* Header */}
      <h2 className="text-2xl font-bold text-[#07172E]">Dashboard</h2>
      <p className="mb-6 mt-1 text-sm text-gray-500">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}! Here&apos;s your freight overview.
      </p>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon="📦"
          value={stats.activeShipments}
          label="Active Shipments"
          sub="+2 this week"
          borderColor="#1559C9"
        />
        <KpiCard
          icon="📡"
          value={stats.inTransit}
          label="In Transit"
          sub={`🚢 ${stats.inTransitByMode.OCEAN} · ✈️ ${stats.inTransitByMode.AIR} · 🚛 ${stats.inTransitByMode.INLAND}`}
          borderColor="#0A7A5E"
        />
        <KpiCard
          icon="📄"
          value={stats.docsPending}
          label="Documents Pending"
          sub="Click to review"
          borderColor="#A05C00"
        />
        <KpiCard
          icon="⚖️"
          value={stats.customsHolds}
          label="Customs Holds"
          sub={
            stats.customsHolds > 0 ? '⚠️ Requires attention' : 'All clear'
          }
          borderColor="#B91C1C"
        />
      </div>

      {/* Table + alerts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* Shipments table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-[#07172E]">
              Recent Shipments
            </h3>
          </div>

          {recent.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-gray-500">
              No active shipments.{' '}
              <Link
                href="/shipments"
                className="font-medium text-[#1559C9] hover:underline"
              >
                Create your first shipment.
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3 font-semibold">Shipment #</th>
                    <th className="px-5 py-3 font-semibold">Mode</th>
                    <th className="px-5 py-3 font-semibold">Route</th>
                    <th className="px-5 py-3 font-semibold">
                      Shipper → Consignee
                    </th>
                    <th className="px-5 py-3 font-semibold">ETD / ETA</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s: Shipment) => {
                    const mode = MODE_META[s.mode] ?? {
                      emoji: '📦',
                      label: s.mode,
                    };
                    const etaPast = isPastEta(s.eta);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/shipments/${s.id}`}
                            className="font-medium text-[#1559C9] hover:underline"
                          >
                            {s.shipmentNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                          <span className="mr-1">{mode.emoji}</span>
                          {mode.label}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                          {s.originPort} → {s.destinationPort}
                        </td>
                        <td className="px-5 py-3 text-gray-700">
                          <span
                            className="inline-block max-w-[180px] truncate align-bottom"
                            title={s.shipper?.name}
                          >
                            {s.shipper?.name ?? '—'}
                          </span>
                          <span className="mx-1 text-gray-400">→</span>
                          <span
                            className="inline-block max-w-[180px] truncate align-bottom"
                            title={s.consignee?.name}
                          >
                            {s.consignee?.name ?? '—'}
                          </span>
                        </td>
                        <td
                          className={`px-5 py-3 whitespace-nowrap ${
                            etaPast ? 'text-red-600' : 'text-gray-700'
                          }`}
                        >
                          {formatDate(s.etd)} / {formatDate(s.eta)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/shipments/${s.id}`}
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alerts panel */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-[#07172E]">Alerts</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {ALERTS.map((a) => (
              <li
                key={a.text}
                className="flex items-start gap-3 px-5 py-3 text-sm text-gray-700"
              >
                <span className="mt-0.5 text-xs">{a.dot}</span>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
