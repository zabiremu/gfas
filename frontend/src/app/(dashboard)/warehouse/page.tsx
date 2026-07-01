'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import type { WarehouseEntry, WarehouseStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Toast, { type ToastType } from '@/components/ui/Toast';
import CreateWarehouseEntryModal from '@/components/warehouse/CreateWarehouseEntryModal';
import { useAuthStore } from '@/store/auth.store';

const MANAGER_ROLES = ['ADMIN', 'AGENT', 'WAREHOUSE'];

const STATUS_OPTIONS: { value: '' | WarehouseStatus; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'IN_STORAGE', label: 'In Storage' },
  { value: 'RELEASED', label: 'Released' },
];

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20';

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string | string[] })
      ?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg ?? 'Something went wrong';
  }
  return 'Something went wrong';
}

function formatLocation(e: WarehouseEntry): string {
  const parts = [
    e.zone && `Zone ${e.zone}`,
    e.aisle && `Aisle ${e.aisle}`,
    e.rack && `Rack ${e.rack}`,
    e.level && `Level ${e.level}`,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function WhStatusBadge({ status }: { status: WarehouseStatus }) {
  const map: Record<WarehouseStatus, { cls: string; label: string }> = {
    IN_STORAGE: { cls: 'bg-green-100 text-green-700', label: 'IN STORAGE' },
    RELEASED: { cls: 'bg-gray-100 text-gray-600', label: 'RELEASED' },
  };
  const s = map[status] ?? map.IN_STORAGE;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export default function WarehousePage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = MANAGER_ROLES.includes(user?.role ?? '');

  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState<'' | WarehouseStatus>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );
  const notify = (message: string, type: ToastType = 'info') =>
    setToast({ message, type });

  // Debounce search input (400ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: entries, isLoading, isError } = useQuery<WarehouseEntry[]>({
    queryKey: ['warehouse', { status, q: debouncedQ }],
    queryFn: async () => {
      const res = await api.get<WarehouseEntry[]>('/warehouse', {
        params: {
          status: status || undefined,
          q: debouncedQ || undefined,
        },
      });
      return res.data;
    },
  });

  const rows = entries ?? [];

  const handleRelease = async (entry: WarehouseEntry) => {
    if (!window.confirm(`Release ${entry.batchNumber} from storage?`)) return;
    try {
      await api.patch(`/warehouse/${entry.id}/release`);
      notify('Entry released.', 'success');
      await qc.invalidateQueries({ queryKey: ['warehouse'] });
    } catch (err) {
      notify(extractError(err), 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#07172E]">Warehouse</h2>
          <p className="mt-1 text-sm text-gray-500">
            Inventory, storage locations and movement history
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-[#1559C9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3]"
          >
            + New Intake
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20 sm:max-w-md"
          placeholder="Search customer or batch number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | WarehouseStatus)}
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
            Failed to load warehouse entries. Please try again.
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <div className="text-4xl">🏭</div>
            <p className="mt-3 text-sm text-gray-500">
              No warehouse entries found.
              {canManage && ' Register your first intake to get started.'}
            </p>
            {canManage && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 rounded-lg bg-[#1559C9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3]"
              >
                + New Intake
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Batch / Lot</th>
                  <th className="px-5 py-3 font-semibold">Pallets</th>
                  <th className="px-5 py-3 font-semibold">Weight (kg)</th>
                  <th className="px-5 py-3 font-semibold">Location</th>
                  <th className="px-5 py-3 font-semibold">Stored</th>
                  <th className="px-5 py-3 font-semibold">Hazmat</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  {canManage && (
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {e.customerName}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {e.batchNumber}
                      {e.lotNumber && (
                        <span className="text-gray-400"> · {e.lotNumber}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{e.numPallets}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                      {Number(e.weightKg).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                      {formatLocation(e)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                      {formatDate(e.storageStartDate)}
                    </td>
                    <td className="px-5 py-3">
                      {e.isHazmat ? (
                        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                          ☢️ {e.hazmatClass ? `Class ${e.hazmatClass}` : 'HAZ'}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <WhStatusBadge status={e.status} />
                    </td>
                    {canManage && (
                      <td className="px-5 py-3">
                        {e.status === 'IN_STORAGE' ? (
                          <button
                            onClick={() => handleRelease(e)}
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Release
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Released {e.releasedAt ? formatDate(e.releasedAt) : ''}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && (
        <CreateWarehouseEntryModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={() => notify('Intake registered.', 'success')}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
