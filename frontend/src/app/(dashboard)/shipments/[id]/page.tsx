'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import type {
  Party,
  Shipment,
  ShipmentDocument,
  ShipmentStatus,
  TrackingEvent,
} from '@/types';
import { formatDate, formatDocType } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import ModeBadge from '@/components/ui/ModeBadge';
import Toast, { type ToastType } from '@/components/ui/Toast';

const PROGRESS: ShipmentStatus[] = [
  'DRAFT',
  'BOOKED',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
];

const TABS = [
  'Overview',
  'Documents',
  'Tracking',
  'Containers',
  'History',
] as const;
type Tab = (typeof TABS)[number];

const DOC_TYPES = [
  'HOUSE_BILL_OF_LADING',
  'COMMERCIAL_INVOICE',
  'PACKING_LIST',
  'CERTIFICATE_OF_ORIGIN',
];

type Notify = (message: string, type?: ToastType) => void;

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string | string[] })
      ?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg ?? 'Something went wrong';
  }
  return 'Something went wrong';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ShipmentDetailPage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const [tab, setTab] = useState<Tab>('Overview');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );
  const notify: Notify = (message, type = 'info') => setToast({ message, type });

  const { data: shipment, isLoading, isError } = useQuery<Shipment>({
    queryKey: ['shipment', id],
    queryFn: async () => (await api.get<Shipment>(`/shipments/${id}`)).data,
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading shipment…</div>;
  }

  if (isError || !shipment) {
    return (
      <div>
        <Link
          href="/shipments"
          className="text-sm text-[#1559C9] hover:underline"
        >
          ← Back to Shipments
        </Link>
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Shipment not found.
        </div>
      </div>
    );
  }

  const currentIndex = PROGRESS.indexOf(shipment.status);

  return (
    <div>
      {/* Back */}
      <Link
        href="/shipments"
        className="text-sm text-[#1559C9] hover:underline"
      >
        ← Back to Shipments
      </Link>

      {/* Header row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[#07172E]">
            {shipment.shipmentNumber}
          </h2>
          <ModeBadge mode={shipment.mode} />
          <StatusBadge status={shipment.status} />
          {shipment.isHazmat && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              ☢️ HAZ
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => notify('Edit is coming soon.', 'info')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Edit
          </button>
          <Link
            href={`/documents?shipmentId=${shipment.id}`}
            className="rounded-lg bg-[#1559C9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3]"
          >
            Generate Docs
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center">
          {PROGRESS.map((st, i) => {
            const reached = currentIndex >= 0 && i <= currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <Fragment key={st}>
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      reached
                        ? 'bg-[#1559C9] text-white'
                        : 'bg-gray-200 text-gray-500'
                    } ${isCurrent ? 'ring-4 ring-[#1559C9]/20' : ''}`}
                  >
                    {reached ? '✓' : i + 1}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] font-medium uppercase tracking-wide ${
                      reached ? 'text-[#07172E]' : 'text-gray-400'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </span>
                </div>
                {i < PROGRESS.length - 1 && (
                  <div
                    className={`mx-1 mb-4 h-0.5 flex-1 ${
                      currentIndex > i ? 'bg-[#1559C9]' : 'bg-gray-200'
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>

        {shipment.status === 'CUSTOMS_HOLD' && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
            ⚠️ This shipment is on customs hold and requires attention.
          </div>
        )}
        {shipment.status === 'CANCELLED' && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600">
            This shipment has been cancelled.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t
                ? 'border-[#1559C9] text-[#1559C9]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-5">
        {tab === 'Overview' && <OverviewTab shipment={shipment} />}
        {tab === 'Documents' && <DocumentsTab id={id} notify={notify} />}
        {tab === 'Tracking' && <TrackingTab id={id} notify={notify} />}
        {(tab === 'Containers' || tab === 'History') && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center text-sm text-gray-400">
            {tab} view is coming soon.
          </div>
        )}
      </div>

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

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------
function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="text-sm font-medium text-gray-800">
        {value === undefined || value === null || value === '' ? '—' : value}
      </span>
    </div>
  );
}

function PartyBlock({
  label,
  party,
  fallback,
}: {
  label: string;
  party?: Party;
  fallback: 'warning' | 'consignee';
}) {
  return (
    <div className="border-b border-gray-100 pb-3 last:border-0">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      {party ? (
        <div className="text-sm text-gray-800">
          <div className="font-semibold">{party.name}</div>
          {party.address && <div className="text-gray-600">{party.address}</div>}
          {(party.city || party.country) && (
            <div className="text-gray-600">
              {[party.city, party.country].filter(Boolean).join(', ')}
            </div>
          )}
          {party.phone && <div className="text-gray-600">{party.phone}</div>}
          {party.email && <div className="text-gray-600">{party.email}</div>}
        </div>
      ) : fallback === 'warning' ? (
        <div className="text-sm font-medium text-red-600">⚠️ Not assigned</div>
      ) : (
        <div className="text-sm italic text-gray-500">Same as consignee</div>
      )}
    </div>
  );
}

function OverviewTab({ shipment }: { shipment: Shipment }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Shipment info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#07172E]">
          Shipment Information
        </h3>
        <InfoRow label="Mode" value={shipment.mode} />
        <InfoRow label="Origin Port" value={shipment.originPort} />
        <InfoRow label="Destination Port" value={shipment.destinationPort} />
        <InfoRow label="ETD" value={formatDate(shipment.etd)} />
        <InfoRow label="ETA" value={formatDate(shipment.eta)} />
        <InfoRow
          label="Vessel / Flight"
          value={shipment.vesselName || shipment.flightNumber || '—'}
        />
        <InfoRow label="Goods Description" value={shipment.goodsDescription} />
        <InfoRow label="HS Code" value={shipment.hsCode} />
        <InfoRow label="Country of Origin" value={shipment.countryOfOrigin} />
        <InfoRow
          label="Gross Weight"
          value={`${shipment.grossWeightKg} kg`}
        />
        <InfoRow
          label="Volume"
          value={shipment.volumeCbm ? `${shipment.volumeCbm} CBM` : '—'}
        />
        <InfoRow
          label="Packages"
          value={`${shipment.numPackages} ${shipment.packageType}`}
        />
        <InfoRow
          label="Declared Value"
          value={
            shipment.declaredValueUsd
              ? `USD ${shipment.declaredValueUsd}`
              : '—'
          }
        />
      </div>

      {/* Right column */}
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[#07172E]">Parties</h3>
          <PartyBlock
            label="Shipper"
            party={shipment.shipper}
            fallback="warning"
          />
          <PartyBlock
            label="Consignee"
            party={shipment.consignee}
            fallback="warning"
          />
          <PartyBlock
            label="Notify Party"
            party={shipment.notifyParty}
            fallback="consignee"
          />
        </div>

        {shipment.isHazmat && (
          <div className="rounded-xl border-2 border-red-300 bg-red-50/40 p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-red-700">
              ☢️ Hazardous Cargo
            </h3>
            <InfoRow label="UN Number" value={shipment.hazmatUnNumber} />
            <InfoRow
              label="Proper Shipping Name"
              value={shipment.hazmatProperShippingName}
            />
            <InfoRow label="Class" value={shipment.hazmatClass} />
            <InfoRow label="Packing Group" value={shipment.hazmatPackingGroup} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documents tab
// ---------------------------------------------------------------------------
function DocumentsTab({ id, notify }: { id: string; notify: Notify }) {
  const qc = useQueryClient();
  const [genOpen, setGenOpen] = useState(false);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [generating, setGenerating] = useState(false);

  const { data: docs = [], isLoading } = useQuery<ShipmentDocument[]>({
    queryKey: ['documents', id],
    queryFn: async () =>
      (await api.get<ShipmentDocument[]>('/documents', {
        params: { shipmentId: id },
      })).data,
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Backend route: POST /documents/generate/:shipmentId  body { docType }
      await api.post(`/documents/generate/${id}`, { docType });
      notify('Document generated successfully.', 'success');
      setGenOpen(false);
      await qc.invalidateQueries({ queryKey: ['documents', id] });
    } catch (err) {
      notify(extractError(err), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (doc: ShipmentDocument) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.docType}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify('Download failed.', 'error');
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-[#07172E]">Documents</h3>
        <button
          onClick={() => setGenOpen(true)}
          className="rounded-lg bg-[#1559C9] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1148a3]"
        >
          + Generate Document
        </button>
      </div>

      {isLoading ? (
        <div className="px-5 py-12 text-center text-sm text-gray-400">
          Loading documents…
        </div>
      ) : docs.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-gray-500">
          No documents yet. Generate the first one.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <div>
                <div className="text-sm font-medium text-gray-800">
                  {formatDocType(doc.docType)}
                </div>
                <div className="mt-0.5 text-xs text-gray-400">
                  v{doc.version} · Generated {formatDate(doc.generatedAt)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DocStatusPill status={doc.status} />
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={!doc.fileUrl}
                  className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Download
                </button>
                <button
                  onClick={() =>
                    notify('Void is not available in this build.', 'info')
                  }
                  className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Void
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Generate modal */}
      {genOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#07172E]">
              Generate Document
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Choose a document type to generate as a PDF.
            </p>
            <select
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatDocType(t)}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setGenOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-lg bg-[#1559C9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3] disabled:opacity-60"
              >
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    ISSUED: 'bg-blue-100 text-blue-700',
    SENT: 'bg-teal-100 text-teal-700',
    SIGNED: 'bg-green-100 text-green-700',
    VOID: 'bg-red-100 text-red-700 line-through',
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        map[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tracking tab
// ---------------------------------------------------------------------------
function TrackingTab({ id, notify }: { id: string; notify: Notify }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    eventCode: '',
    eventDescription: '',
    locationName: '',
    eventTime: '',
  });

  const { data: events = [], isLoading } = useQuery<TrackingEvent[]>({
    queryKey: ['tracking', id],
    queryFn: async () =>
      (await api.get<TrackingEvent[]>(`/shipments/${id}/tracking`)).data,
  });

  const submit = async () => {
    if (!form.eventCode || !form.eventDescription || !form.eventTime) {
      notify('Event code, description and time are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/shipments/${id}/tracking`, {
        eventCode: form.eventCode,
        eventDescription: form.eventDescription,
        locationName: form.locationName || undefined,
        eventTime: new Date(form.eventTime).toISOString(),
      });
      notify('Tracking event added.', 'success');
      setAddOpen(false);
      setForm({
        eventCode: '',
        eventDescription: '',
        locationName: '',
        eventTime: '',
      });
      await qc.invalidateQueries({ queryKey: ['tracking', id] });
    } catch (err) {
      notify(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-[#07172E]">Tracking</h3>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-[#1559C9] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1148a3]"
        >
          + Add Event
        </button>
      </div>

      {isLoading ? (
        <div className="px-5 py-12 text-center text-sm text-gray-400">
          Loading tracking…
        </div>
      ) : events.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-gray-500">
          No tracking events yet.
        </div>
      ) : (
        <ul className="px-5 py-4">
          {events.map((e, i) => (
            <li key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-3 w-3 rounded-full bg-[#1559C9]" />
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
                <div className="mt-0.5 text-xs text-gray-400">
                  {e.locationName ? `${e.locationName} · ` : ''}
                  {new Date(e.eventTime).toLocaleString('en-US')}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add event modal */}
      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#07172E]">
              Add Tracking Event
            </h3>
            <div className="mt-4 space-y-3">
              <input
                className={fieldClass}
                placeholder="Event Code (e.g. DEPARTED_ORIGIN)"
                value={form.eventCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, eventCode: e.target.value }))
                }
              />
              <input
                className={fieldClass}
                placeholder="Description"
                value={form.eventDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, eventDescription: e.target.value }))
                }
              />
              <input
                className={fieldClass}
                placeholder="Location"
                value={form.locationName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, locationName: e.target.value }))
                }
              />
              <input
                type="datetime-local"
                className={fieldClass}
                value={form.eventTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, eventTime: e.target.value }))
                }
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setAddOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="rounded-lg bg-[#1559C9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
