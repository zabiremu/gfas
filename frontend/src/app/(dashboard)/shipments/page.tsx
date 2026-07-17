'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Shipment, ShipmentDirection, ShipmentMode, ShipmentStatus } from '@/types';
import { formatDate, isOverdue } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import ModeBadge from '@/components/ui/ModeBadge';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import CreateShipmentModal from '@/components/shipments/CreateShipmentModal';

const MODE_OPTIONS: { value: '' | ShipmentMode; label: string }[] = [
  { value: '', label: 'All Modes' },
  { value: 'OCEAN', label: '🚢 Ocean' },
  { value: 'AIR', label: '✈️ Air' },
  { value: 'INLAND', label: '🚛 Inland' },
  { value: 'RAIL', label: '🚆 Rail' },
];

const DIRECTION_OPTIONS: { value: '' | ShipmentDirection; label: string }[] = [
  { value: '', label: 'All Directions' },
  { value: 'IMPORT', label: 'Import' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'DOMESTIC', label: 'Domestic' },
];

const STATUS_OPTIONS: { value: '' | ShipmentStatus; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'CUSTOMS_HOLD', label: 'Customs Hold' },
  { value: 'ARRIVED', label: 'Arrived' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20';

export default function ShipmentsPage() {
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [mode, setMode] = useState<'' | ShipmentMode>('');
  const [direction, setDirection] = useState<'' | ShipmentDirection>('');
  const [status, setStatus] = useState<'' | ShipmentStatus>('');
  const [modalOpen, setModalOpen] = useState(false);

  // Debounce search input (400ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: shipments, isLoading, isError } = useQuery<Shipment[]>({
    queryKey: ['shipments', { status, mode, direction, q: debouncedQ }],
    queryFn: async () => {
      const res = await api.get<Shipment[]>('/shipments', {
        params: {
          status: status || undefined,
          mode: mode || undefined,
          direction: direction || undefined,
          q: debouncedQ || undefined,
        },
      });
      return res.data;
    },
  });

  const rows = shipments ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#07172E]">Shipments</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-[#1559C9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3]"
        >
          + New Shipment
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20 sm:max-w-md"
          placeholder="Search shipment # or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={selectClass}
          value={mode}
          onChange={(e) => setMode(e.target.value as '' | ShipmentMode)}
        >
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={direction}
          onChange={(e) => setDirection(e.target.value as '' | ShipmentDirection)}
        >
          {DIRECTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | ShipmentStatus)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <LoadingSkeleton rows={5} />
        ) : isError ? (
          <div className="px-5 py-16 text-center text-sm text-red-600">
            Failed to load shipments. Please try again.
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <div className="text-4xl">⚓</div>
            <p className="mt-3 text-sm text-gray-500">
              No shipments found. Create your first shipment to get started.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-lg bg-[#1559C9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3]"
            >
              + New Shipment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Shipment #</th>
                  <th className="px-5 py-3 font-semibold">Mode</th>
                  <th className="px-5 py-3 font-semibold">Direction</th>
                  <th className="px-5 py-3 font-semibold">Route</th>
                  <th className="px-5 py-3 font-semibold">Parties</th>
                  <th className="px-5 py-3 font-semibold">ETD / ETA</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Hazmat</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const etaPast = isOverdue(s.eta);
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/shipments/${s.id}`}
                          className="font-semibold text-[#1559C9] hover:underline"
                        >
                          {s.shipmentNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <ModeBadge mode={s.mode} />
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {s.direction
                          ? s.direction.charAt(0) + s.direction.slice(1).toLowerCase()
                          : <span className="text-gray-400">Unknown</span>}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                        {s.originPort} → {s.destinationPort}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        <span
                          className="inline-block max-w-[160px] truncate align-bottom"
                          title={s.shipper?.name}
                        >
                          {s.shipper?.name || '—'}
                        </span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span
                          className="inline-block max-w-[160px] truncate align-bottom"
                          title={s.consignee?.name}
                        >
                          {s.consignee?.name || '—'}
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
                        {s.cargoItems?.some((c) => c.isHazmat) ? (
                          <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                            ☢️ HAZ
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/shipments/${s.id}`}
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            View
                          </Link>
                          <Link
                            href={`/documents?shipmentId=${s.id}`}
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Docs
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateShipmentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
