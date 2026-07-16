'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Party, PartyRole } from '@/types';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import PartyFormModal from '@/components/parties/PartyFormModal';

const ROLE_FILTER_OPTIONS: { value: '' | PartyRole; label: string }[] = [
  { value: '', label: 'All Roles' },
  { value: 'SHIPPER', label: 'Shipper' },
  { value: 'CONSIGNEE', label: 'Consignee' },
  { value: 'NOTIFY_PARTY', label: 'Notify Party' },
  { value: 'FREIGHT_FORWARDER', label: 'Freight Forwarder' },
  { value: 'CUSTOMS_BROKER', label: 'Customs Broker' },
];

const ROLE_LABELS: Record<PartyRole, string> = {
  SHIPPER: 'Shipper',
  CONSIGNEE: 'Consignee',
  NOTIFY_PARTY: 'Notify Party',
  FREIGHT_FORWARDER: 'Freight Forwarder',
  CUSTOMS_BROKER: 'Customs Broker',
};

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20';

export default function PartiesPage() {
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [role, setRole] = useState<'' | PartyRole>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: parties, isLoading, isError } = useQuery<Party[]>({
    queryKey: ['parties', role, debouncedQ],
    queryFn: async () => {
      const res = await api.get<Party[]>('/parties', {
        params: { role: role || undefined, q: debouncedQ || undefined },
      });
      return res.data;
    },
  });

  const rows = parties ?? [];

  const openCreate = () => {
    setEditingParty(null);
    setModalOpen(true);
  };
  const openEdit = (p: Party) => {
    setEditingParty(p);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingParty(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#07172E]">Parties</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-[#1559C9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3]"
        >
          + New Party
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20 sm:max-w-md"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={selectClass}
          value={role}
          onChange={(e) => setRole(e.target.value as '' | PartyRole)}
        >
          {ROLE_FILTER_OPTIONS.map((o) => (
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
            Failed to load parties. Please try again.
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <div className="text-4xl">🏢</div>
            <p className="mt-3 text-sm text-gray-500">
              No parties found. Add your first shipper, consignee, or partner
              to get started.
            </p>
            <button
              onClick={openCreate}
              className="mt-4 rounded-lg bg-[#1559C9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3]"
            >
              + New Party
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Default Role</th>
                  <th className="px-5 py-3 font-semibold">Location</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-semibold text-gray-800">
                      {p.name}
                    </td>
                    <td className="px-5 py-3">
                      {p.defaultRole ? (
                        <span className="inline-block rounded-full bg-[#1559C9]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1559C9]">
                          {ROLE_LABELS[p.defaultRole]}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {[p.city, p.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      <div>{p.email || '—'}</div>
                      {p.phone && (
                        <div className="text-xs text-gray-400">{p.phone}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PartyFormModal open={modalOpen} onClose={closeModal} party={editingParty} />
    </div>
  );
}
