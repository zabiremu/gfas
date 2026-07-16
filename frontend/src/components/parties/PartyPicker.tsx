'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Party, PartyRole } from '@/types';

interface PartyPickerProps {
  role?: PartyRole;
  label: string;
  required?: boolean;
  selectedName: string | null;
  onSelect: (party: Party) => void;
  onClear: () => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

// Searchable party dropdown: shows a debounced-search input until a party is
// selected, then collapses to a chip with a "Clear" affordance. `role` is an
// optional hint passed through to GET /parties?role=... to pre-filter the
// suggestion list (parties.default_role) — it does not restrict the party
// to that role, since a party's real role is per-shipment.
export default function PartyPicker({
  role,
  label,
  required,
  selectedName,
  onSelect,
  onClear,
}: PartyPickerProps) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: parties = [], isFetching } = useQuery<Party[]>({
    queryKey: ['parties', role, debounced],
    queryFn: async () => {
      const res = await api.get<Party[]>('/parties', {
        params: { role, q: debounced || undefined },
      });
      return res.data;
    },
    enabled: open && !selectedName,
  });

  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {selectedName ? (
        <div className="flex items-center justify-between rounded-lg border border-[#1559C9]/40 bg-[#1559C9]/5 px-3 py-2 text-sm">
          <span className="font-medium text-gray-800">{selectedName}</span>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            className={inputClass}
            placeholder={`Search ${label.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && (
            <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {isFetching && (
                <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
              )}
              {!isFetching && parties.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">
                  No parties found
                </div>
              )}
              {parties.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(p);
                    setSearch('');
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-800">{p.name}</span>
                  {(p.city || p.country) && (
                    <span className="text-xs text-gray-400">
                      {[p.city, p.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
