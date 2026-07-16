'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import type { WarehouseFacility } from '@/types';

interface CreateWarehouseEntryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface FormState {
  warehouseId: string;
  customerName: string;
  batchNumber: string;
  lotNumber: string;
  numPallets: string;
  weightKg: string;
  storageStartDate: string;
  storageEndDate: string;
  zone: string;
  aisle: string;
  rack: string;
  level: string;
  tempMin: string;
  tempMax: string;
  isHazmat: boolean;
  hazmatClass: string;
  hazmatUnNumber: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const INITIAL: FormState = {
  warehouseId: '',
  customerName: '',
  batchNumber: '',
  lotNumber: '',
  numPallets: '',
  weightKg: '',
  storageStartDate: today(),
  storageEndDate: '',
  zone: '',
  aisle: '',
  rack: '',
  level: '',
  tempMin: '',
  tempMax: '',
  isHazmat: false,
  hazmatClass: '',
  hazmatUnNumber: '',
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';
const sectionTitle =
  'mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500';

export default function CreateWarehouseEntryModal({
  open,
  onClose,
  onCreated,
}: CreateWarehouseEntryModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: warehouses = [] } = useQuery<WarehouseFacility[]>({
    queryKey: ['warehouses'],
    queryFn: async () =>
      (await api.get<WarehouseFacility[]>('/warehouses')).data,
    enabled: open,
  });

  // Default to the first (usually only) facility once loaded.
  useEffect(() => {
    if (open && !form.warehouseId && warehouses.length > 0) {
      set('warehouseId', warehouses[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, warehouses]);

  const reset = () => {
    setForm(INITIAL);
    setErrors({});
    setSubmitError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (!open) return null;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.warehouseId) e.warehouseId = 'Select a warehouse facility';
    if (!form.customerName.trim()) e.customerName = 'Customer name is required';
    if (!form.batchNumber.trim()) e.batchNumber = 'Batch number is required';
    if (!form.numPallets.trim() || Number(form.numPallets) <= 0)
      e.numPallets = 'Enter a valid pallet count';
    if (!form.weightKg.trim() || Number(form.weightKg) <= 0)
      e.weightKg = 'Enter a valid weight';
    if (!form.storageStartDate) e.storageStartDate = 'Start date is required';
    if (form.isHazmat && !form.hazmatUnNumber.trim())
      e.hazmatUnNumber = 'UN number is required for hazmat';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => {
    const p: Record<string, unknown> = {
      warehouseId: form.warehouseId,
      customerName: form.customerName.trim(),
      batchNumber: form.batchNumber.trim(),
      numPallets: Number(form.numPallets),
      weightKg: Number(form.weightKg),
      storageStartDate: form.storageStartDate,
      isHazmat: form.isHazmat,
    };
    if (form.lotNumber) p.lotNumber = form.lotNumber.trim();
    if (form.storageEndDate) p.storageEndDate = form.storageEndDate;
    if (form.zone) p.zone = form.zone.trim();
    if (form.aisle) p.aisle = form.aisle.trim();
    if (form.rack) p.rack = form.rack.trim();
    if (form.level) p.level = form.level.trim();
    if (form.tempMin) p.tempMin = Number(form.tempMin);
    if (form.tempMax) p.tempMax = Number(form.tempMax);
    if (form.isHazmat) {
      if (form.hazmatClass) p.hazmatClass = form.hazmatClass.trim();
      if (form.hazmatUnNumber) p.hazmatUnNumber = form.hazmatUnNumber.trim();
    }
    return p;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post('/warehouse', buildPayload());
      await qc.invalidateQueries({ queryKey: ['warehouse'] });
      handleClose();
      onCreated?.();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string | string[] })
          ?.message;
        setSubmitError(
          Array.isArray(msg)
            ? msg.join(', ')
            : msg ?? 'Failed to create warehouse entry.',
        );
      } else {
        setSubmitError('Failed to create warehouse entry.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#07172E]">New Intake</h2>
            <p className="text-xs text-gray-500">
              Register cargo into the warehouse
            </p>
          </div>
          <button
            onClick={handleClose}
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

          {/* Cargo */}
          <div className="mb-6">
            <div className={sectionTitle}>Cargo</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Warehouse Facility *</label>
                <select
                  className={inputClass}
                  value={form.warehouseId}
                  onChange={(e) => set('warehouseId', e.target.value)}
                >
                  <option value="">Select a facility…</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                {errors.warehouseId && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.warehouseId}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Customer Name *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Acme International Export LLC"
                  value={form.customerName}
                  onChange={(e) => set('customerName', e.target.value)}
                />
                {errors.customerName && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.customerName}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Batch Number *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. BATCH-2025-0612-A"
                  value={form.batchNumber}
                  onChange={(e) => set('batchNumber', e.target.value)}
                />
                {errors.batchNumber && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.batchNumber}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Lot Number</label>
                <input
                  className={inputClass}
                  placeholder="e.g. LOT-4421-B"
                  value={form.lotNumber}
                  onChange={(e) => set('lotNumber', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Pallets *</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.numPallets}
                  onChange={(e) => set('numPallets', e.target.value)}
                />
                {errors.numPallets && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.numPallets}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Weight (kg) *</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.weightKg}
                  onChange={(e) => set('weightKg', e.target.value)}
                />
                {errors.weightKg && (
                  <p className="mt-1 text-xs text-red-600">{errors.weightKg}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Storage Start *</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.storageStartDate}
                  onChange={(e) => set('storageStartDate', e.target.value)}
                />
                {errors.storageStartDate && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.storageStartDate}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Storage End</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.storageEndDate}
                  onChange={(e) => set('storageEndDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <div className={sectionTitle}>Storage Location</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Zone</label>
                <input
                  className={inputClass}
                  placeholder="B"
                  value={form.zone}
                  onChange={(e) => set('zone', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Aisle</label>
                <input
                  className={inputClass}
                  placeholder="12"
                  value={form.aisle}
                  onChange={(e) => set('aisle', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Rack</label>
                <input
                  className={inputClass}
                  placeholder="4"
                  value={form.rack}
                  onChange={(e) => set('rack', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Level</label>
                <input
                  className={inputClass}
                  placeholder="2"
                  value={form.level}
                  onChange={(e) => set('level', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Min Temp (°C)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.tempMin}
                  onChange={(e) => set('tempMin', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Max Temp (°C)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.tempMax}
                  onChange={(e) => set('tempMax', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Hazmat */}
          <div>
            <div className={sectionTitle}>Hazardous Material</div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.isHazmat}
                onChange={(e) => set('isHazmat', e.target.checked)}
              />
              ☢️ This cargo is hazardous
            </label>
            {form.isHazmat && (
              <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-red-200 bg-red-50/50 p-4">
                <div>
                  <label className={labelClass}>UN Number *</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. UN1219"
                    value={form.hazmatUnNumber}
                    onChange={(e) => set('hazmatUnNumber', e.target.value)}
                  />
                  {errors.hazmatUnNumber && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.hazmatUnNumber}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Hazmat Class</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. 3"
                    value={form.hazmatClass}
                    onChange={(e) => set('hazmatClass', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
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
            {submitting ? 'Saving…' : 'Create Intake'}
          </button>
        </div>
      </div>
    </div>
  );
}
