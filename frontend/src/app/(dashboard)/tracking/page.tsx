'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Shipment, TrackingEvent } from '@/types';

export default function TrackingPage() {
  const [selectedId, setSelectedId] = useState('');

  const { data: shipments = [] } = useQuery<Shipment[]>({
    queryKey: ['shipments', 'IN_TRANSIT'],
    queryFn: async () =>
      (await api.get<Shipment[]>('/shipments', {
        params: { status: 'IN_TRANSIT' },
      })).data,
  });

  // Default to SHP-2025-0001 (or the first in-transit shipment).
  useEffect(() => {
    if (!selectedId && shipments.length > 0) {
      const preferred =
        shipments.find((s) => s.shipmentNumber === 'SHP-2025-0001') ??
        shipments[0];
      setSelectedId(preferred.id);
    }
  }, [shipments, selectedId]);

  const { data: events = [], isLoading } = useQuery<TrackingEvent[]>({
    queryKey: ['tracking', selectedId],
    queryFn: async () =>
      (await api.get<TrackingEvent[]>(`/shipments/${selectedId}/tracking`)).data,
    enabled: !!selectedId,
  });

  return (
    <div>
      {/* Header */}
      <h2 className="text-2xl font-bold text-[#07172E]">Live Tracking</h2>
      <p className="mb-5 mt-1 text-sm text-gray-500">
        Real-time cargo location and event log
      </p>

      {/* Shipment selector */}
      <div className="mb-6 max-w-sm">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Select shipment
        </label>
        <select
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {shipments.length === 0 && <option value="">No shipments</option>}
          {shipments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.shipmentNumber} · {s.originPort} → {s.destinationPort}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Timeline */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[#07172E]">
            Event Timeline
          </h3>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Loading events…
            </div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No tracking events for this shipment.
            </div>
          ) : (
            <ul>
              {events.map((e, i) => {
                const isLatest = i === 0;
                return (
                  <li key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`mt-1 h-3.5 w-3.5 rounded-full ${
                          isLatest ? 'bg-green-500 ring-4 ring-green-100' : 'bg-gray-300'
                        }`}
                      />
                      {i < events.length - 1 && (
                        <span className="my-1 w-px flex-1 bg-gray-200" />
                      )}
                    </div>
                    <div className="pb-5">
                      <div className="text-sm font-bold text-[#07172E]">
                        {e.eventCode}
                      </div>
                      <div className="text-sm text-gray-700">
                        {e.eventDescription}
                      </div>
                      {e.locationName && (
                        <div className="mt-0.5 text-xs text-gray-500">
                          📍 {e.locationName}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        {new Date(e.eventTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Map placeholder */}
        <div
          className="flex flex-col items-center justify-center rounded-xl p-8 text-center text-white shadow-sm"
          style={{
            background:
              'linear-gradient(135deg, #07304A 0%, #0A5B4E 60%, #07304A 100%)',
            minHeight: '320px',
          }}
        >
          <div className="text-4xl">🗺️</div>
          <div className="mt-2 text-lg font-bold">Live Map</div>
          <div className="mt-1 text-xs text-white/60">
            Mapbox integration available in production
          </div>
          <div className="mt-6 space-y-1 text-sm">
            <div className="font-semibold">Vessel MSC GÜLSÜN — Atlantic Ocean</div>
            <div className="text-white/80">Current position: 45.2°N, 40.5°W</div>
            <div className="text-white/80">ETA Hamburg: Jun 28, 2025</div>
          </div>
        </div>
      </div>
    </div>
  );
}
