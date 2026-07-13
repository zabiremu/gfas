'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import type { DocumentStatus, ShipmentDocument } from '@/types';
import { formatDate, formatDocType } from '@/lib/utils';
import ModeBadge from '@/components/ui/ModeBadge';
import Toast, { type ToastType } from '@/components/ui/Toast';

// Spec-provided direct download (bypasses axios; binary blob).
async function downloadDocument(docId: string, docType: string) {
  const token = localStorage.getItem('amovix_token');
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/documents/${docId}/download`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docType}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string | string[] })
      ?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg ?? 'Something went wrong';
  }
  return 'Something went wrong';
}

const DOC_ICON: Record<string, string> = {
  HOUSE_BILL_OF_LADING: '🚢',
  COMMERCIAL_INVOICE: '💰',
  PACKING_LIST: '📋',
  CERTIFICATE_OF_ORIGIN: '🏛️',
  IMO_DGD: '☢️',
  AIR_WAYBILL: '✈️',
};

const STATUS_OPTIONS: { value: '' | DocumentStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'SENT', label: 'Sent' },
  { value: 'SIGNED', label: 'Signed' },
  { value: 'VOID', label: 'Void' },
];

const DOC_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'HOUSE_BILL_OF_LADING', label: 'House Bill of Lading' },
  { value: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice' },
  { value: 'PACKING_LIST', label: 'Packing List' },
  { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin' },
  { value: 'IMO_DGD', label: 'IMO DGD' },
  { value: 'AIR_WAYBILL', label: 'Air Waybill' },
];

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20';

function DocStatusBadge({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, { cls: string; label: string }> = {
    DRAFT: { cls: 'bg-gray-100 text-gray-600', label: 'DRAFT' },
    ISSUED: { cls: 'bg-blue-100 text-blue-700', label: 'ISSUED' },
    SENT: { cls: 'bg-teal-100 text-teal-700', label: 'SENT' },
    SIGNED: { cls: 'bg-green-100 text-green-700', label: '✓ SIGNED' },
    VOID: { cls: 'bg-red-100 text-red-700 line-through', label: 'VOID' },
  };
  const s = map[status] ?? map.DRAFT;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function DocumentsContent() {
  const searchParams = useSearchParams();
  const shipmentId = searchParams.get('shipmentId') || undefined;
  const qc = useQueryClient();

  const [status, setStatus] = useState<'' | DocumentStatus>('');
  const [docType, setDocType] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );
  const notify = (message: string, type: ToastType = 'info') =>
    setToast({ message, type });

  const { data: docs = [], isLoading, isError } = useQuery<ShipmentDocument[]>({
    queryKey: ['documents', { shipmentId, status, docType }],
    queryFn: async () =>
      (await api.get<ShipmentDocument[]>('/documents', {
        params: {
          shipmentId,
          status: status || undefined,
          docType: docType || undefined,
        },
      })).data,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) =>
      d.shipment?.shipmentNumber?.toLowerCase().includes(q),
    );
  }, [docs, search]);

  const handleDownload = async (doc: ShipmentDocument) => {
    try {
      await downloadDocument(doc.id, doc.docType);
    } catch {
      notify('Download failed.', 'error');
    }
  };

  const handleGenerate = async (doc: ShipmentDocument) => {
    if (!doc.shipment?.id) {
      notify('No shipment linked to this document.', 'error');
      return;
    }
    try {
      // Backend route: POST /documents/generate/:shipmentId body { docType }
      await api.post(`/documents/generate/${doc.shipment.id}`, {
        docType: doc.docType,
      });
      notify('Document generated.', 'success');
      await qc.invalidateQueries({ queryKey: ['documents'] });
    } catch (err) {
      notify(extractError(err), 'error');
    }
  };

  const handleVoid = async (doc: ShipmentDocument) => {
    try {
      await api.patch(`/documents/${doc.id}/void`);
      notify('Document voided.', 'success');
      await qc.invalidateQueries({ queryKey: ['documents'] });
    } catch (err) {
      notify(extractError(err), 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <h2 className="text-2xl font-bold text-[#07172E]">Documents</h2>
      <p className="mb-5 mt-1 text-sm text-gray-500">
        Manage all freight documents across shipments
      </p>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | DocumentStatus)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        >
          {DOC_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20 sm:max-w-xs"
          placeholder="Search by shipment number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-5 py-16 text-center text-sm text-gray-400">
            Loading documents…
          </div>
        ) : isError ? (
          <div className="px-5 py-16 text-center text-sm text-red-600">
            Failed to load documents. Please try again.
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <div className="text-4xl">📄</div>
            <p className="mt-3 text-sm text-gray-500">
              No documents found. Generate documents from a shipment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Document Type</th>
                  <th className="px-5 py-3 font-semibold">Shipment #</th>
                  <th className="px-5 py-3 font-semibold">Mode</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Version</th>
                  <th className="px-5 py-3 font-semibold">Generated</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const downloadable =
                    doc.status === 'ISSUED' ||
                    doc.status === 'SENT' ||
                    doc.status === 'SIGNED';
                  return (
                    <tr
                      key={doc.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-3 whitespace-nowrap font-medium text-gray-800">
                        <span className="mr-2">
                          {DOC_ICON[doc.docType] ?? '📄'}
                        </span>
                        {formatDocType(doc.docType)}
                      </td>
                      <td className="px-5 py-3">
                        {doc.shipment ? (
                          <Link
                            href={`/shipments/${doc.shipment.id}`}
                            className="font-semibold text-[#1559C9] hover:underline"
                          >
                            {doc.shipment.shipmentNumber}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {doc.shipment ? (
                          <ModeBadge mode={doc.shipment.mode} />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <DocStatusBadge status={doc.status} />
                      </td>
                      <td className="px-5 py-3 text-gray-700">v{doc.version}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                        {doc.generatedAt ? formatDate(doc.generatedAt) : 'Pending'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          {downloadable && (
                            <button
                              onClick={() => handleDownload(doc)}
                              className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                            >
                              ⬇ Download
                            </button>
                          )}
                          {doc.status === 'DRAFT' && (
                            <button
                              onClick={() => handleGenerate(doc)}
                              className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                            >
                              ⚙ Generate
                            </button>
                          )}
                          {doc.status !== 'VOID' && (
                            <button
                              onClick={() => handleVoid(doc)}
                              className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            >
                              🚫 Void
                            </button>
                          )}
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

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={<div className="text-sm text-gray-500">Loading documents…</div>}
    >
      <DocumentsContent />
    </Suspense>
  );
}
