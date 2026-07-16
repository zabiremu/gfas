'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import type { Party, PartyRole } from '@/types';

interface PartyFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Pass an existing party to edit it; omit to create a new one. */
  party?: Party | null;
}

const ROLE_OPTIONS: { value: '' | PartyRole; label: string }[] = [
  { value: '', label: '— No default role —' },
  { value: 'SHIPPER', label: 'Shipper' },
  { value: 'CONSIGNEE', label: 'Consignee' },
  { value: 'NOTIFY_PARTY', label: 'Notify Party' },
  { value: 'FREIGHT_FORWARDER', label: 'Freight Forwarder' },
  { value: 'CUSTOMS_BROKER', label: 'Customs Broker' },
];

interface FormState {
  name: string;
  role: '' | PartyRole;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  taxId: string;
}

const EMPTY: FormState = {
  name: '',
  role: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  phone: '',
  email: '',
  taxId: '',
};

const toForm = (p?: Party | null): FormState =>
  p
    ? {
        name: p.name,
        role: p.defaultRole ?? '',
        address: p.address ?? '',
        city: p.city ?? '',
        state: p.state ?? '',
        country: p.country ?? '',
        postalCode: p.postalCode ?? '',
        phone: p.phone ?? '',
        email: p.email ?? '',
        taxId: p.taxId ?? '',
      }
    : EMPTY;

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

export default function PartyFormModal({
  open,
  onClose,
  party,
}: PartyFormModalProps) {
  const qc = useQueryClient();
  const isEdit = Boolean(party);
  const [form, setForm] = useState<FormState>(() => toForm(party));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-sync the form whenever a different party is opened for editing (or
  // the modal is reopened in create mode after being closed).
  useEffect(() => {
    if (open) {
      setForm(toForm(party));
      setErrors({});
      setSubmitError(null);
    }
  }, [open, party]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      e.email = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => {
    const p: Record<string, unknown> = { name: form.name.trim() };
    if (form.role) p.role = form.role;
    if (form.address.trim()) p.address = form.address.trim();
    if (form.city.trim()) p.city = form.city.trim();
    if (form.state.trim()) p.state = form.state.trim();
    if (form.country.trim()) p.country = form.country.trim();
    if (form.postalCode.trim()) p.postalCode = form.postalCode.trim();
    if (form.phone.trim()) p.phone = form.phone.trim();
    if (form.email.trim()) p.email = form.email.trim();
    if (form.taxId.trim()) p.taxId = form.taxId.trim();
    return p;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (isEdit && party) {
        await api.put(`/parties/${party.id}`, buildPayload());
      } else {
        await api.post('/parties', buildPayload());
      }
      await qc.invalidateQueries({ queryKey: ['parties'] });
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string | string[] })
          ?.message;
        setSubmitError(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed to save party.',
        );
      } else {
        setSubmitError('Failed to save party.');
      }
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-[#07172E]">
            {isEdit ? 'Edit Party' : 'New Party'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input
                className={inputClass}
                placeholder="e.g. Acme Logistics Inc."
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Default Role</label>
              <select
                className={inputClass}
                value={form.role}
                onChange={(e) => set('role', e.target.value as '' | PartyRole)}
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-400">
                Just a hint for new-shipment pickers — a party&rsquo;s actual role
                is set per-shipment.
              </p>
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input
                className={inputClass}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>City</label>
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>State / Province</label>
                <input
                  className={inputClass}
                  value={form.state}
                  onChange={(e) => set('state', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  className={inputClass}
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Postal Code</label>
                <input
                  className={inputClass}
                  value={form.postalCode}
                  onChange={(e) => set('postalCode', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Tax ID</label>
                <input
                  className={inputClass}
                  value={form.taxId}
                  onChange={(e) => set('taxId', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-[#1559C9] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Party'}
          </button>
        </div>
      </div>
    </div>
  );
}
