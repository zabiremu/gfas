'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import api from '@/lib/api';
import PartyPicker from '@/components/parties/PartyPicker';
import type { ShipmentDirection, ShipmentMode } from '@/types';

interface CreateShipmentModalProps {
  open: boolean;
  onClose: () => void;
}

const MODES: { value: ShipmentMode; emoji: string; label: string }[] = [
  { value: 'OCEAN', emoji: '🚢', label: 'Ocean' },
  { value: 'AIR', emoji: '✈️', label: 'Air' },
  { value: 'INLAND', emoji: '🚛', label: 'Inland' },
];

const DIRECTIONS: { value: ShipmentDirection; label: string }[] = [
  { value: 'IMPORT', label: 'Import' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'DOMESTIC', label: 'Domestic' },
];

const PACKAGE_TYPES = [
  'Cartons',
  'Pallets',
  'Drums',
  'Crates',
  'IBC Tanks',
  'Bags',
  'Other',
];

interface FormState {
  mode: ShipmentMode | '';
  direction: ShipmentDirection | '';
  originPort: string;
  destinationPort: string;
  etd: string;
  eta: string;
  vesselName: string;
  flightNumber: string;
  mawbNumber: string;
  goodsDescription: string;
  hsCode: string;
  countryOfOrigin: string;
  grossWeightKg: string;
  volumeCbm: string;
  numPackages: string;
  packageType: string;
  declaredValueUsd: string;
  isHazmat: boolean;
  hazmatUnNumber: string;
  hazmatProperShippingName: string;
  hazmatClass: string;
  hazmatPackingGroup: string;
  shipperId: string;
  consigneeId: string;
  notifyPartyId: string;
}

const INITIAL: FormState = {
  mode: '',
  direction: '',
  originPort: '',
  destinationPort: '',
  etd: '',
  eta: '',
  vesselName: '',
  flightNumber: '',
  mawbNumber: '',
  goodsDescription: '',
  hsCode: '',
  countryOfOrigin: '',
  grossWeightKg: '',
  volumeCbm: '',
  numPackages: '',
  packageType: 'Cartons',
  declaredValueUsd: '',
  isHazmat: false,
  hazmatUnNumber: '',
  hazmatProperShippingName: '',
  hazmatClass: '',
  hazmatPackingGroup: '',
  shipperId: '',
  consigneeId: '',
  notifyPartyId: '',
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export default function CreateShipmentModal({
  open,
  onClose,
}: CreateShipmentModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [shipperName, setShipperName] = useState<string | null>(null);
  const [consigneeName, setConsigneeName] = useState<string | null>(null);
  const [notifyName, setNotifyName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(1);
    setForm(INITIAL);
    setShipperName(null);
    setConsigneeName(null);
    setNotifyName(null);
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

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.mode) e.mode = 'Select a transport mode';
      if (!form.direction) e.direction = 'Select a shipment direction';
      if (!form.originPort.trim()) e.originPort = 'Origin port is required';
      if (!form.destinationPort.trim())
        e.destinationPort = 'Destination port is required';
    }
    if (s === 2) {
      if (!form.goodsDescription.trim())
        e.goodsDescription = 'Goods description is required';
      if (!form.grossWeightKg.trim())
        e.grossWeightKg = 'Gross weight is required';
      if (!form.numPackages.trim())
        e.numPackages = 'Number of packages is required';
      if (form.isHazmat) {
        if (!form.hazmatUnNumber.trim())
          e.hazmatUnNumber = 'UN number is required for hazmat';
        if (!form.hazmatProperShippingName.trim())
          e.hazmatProperShippingName = 'Proper shipping name is required';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep(step)) setStep((s) => Math.min(3, s + 1));
  };
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const buildPayload = () => {
    const p: Record<string, unknown> = {
      mode: form.mode,
      direction: form.direction,
      originPort: form.originPort.trim(),
      destinationPort: form.destinationPort.trim(),
      goodsDescription: form.goodsDescription.trim(),
      grossWeightKg: Number(form.grossWeightKg),
      numPackages: Number(form.numPackages),
      packageType: form.packageType || 'Other',
      isHazmat: form.isHazmat,
    };
    if (form.etd) p.etd = form.etd;
    if (form.eta) p.eta = form.eta;
    if (form.mode === 'OCEAN' && form.vesselName)
      p.vesselName = form.vesselName.trim();
    if (form.mode === 'AIR' && form.flightNumber)
      p.flightNumber = form.flightNumber.trim();
    if (form.mode === 'AIR' && form.mawbNumber)
      p.mawbNumber = form.mawbNumber.trim();
    if (form.hsCode) p.hsCode = form.hsCode.trim();
    if (form.countryOfOrigin) p.countryOfOrigin = form.countryOfOrigin.trim();
    if (form.volumeCbm) p.volumeCbm = Number(form.volumeCbm);
    if (form.declaredValueUsd) p.declaredValueUsd = Number(form.declaredValueUsd);
    if (form.isHazmat) {
      if (form.hazmatUnNumber) p.hazmatUnNumber = form.hazmatUnNumber.trim();
      if (form.hazmatProperShippingName)
        p.hazmatProperShippingName = form.hazmatProperShippingName.trim();
      if (form.hazmatClass) p.hazmatClass = form.hazmatClass.trim();
      if (form.hazmatPackingGroup)
        p.hazmatPackingGroup = form.hazmatPackingGroup;
    }
    if (form.shipperId) p.shipperId = form.shipperId;
    if (form.consigneeId) p.consigneeId = form.consigneeId;
    if (form.notifyPartyId) p.notifyPartyId = form.notifyPartyId;
    return p;
  };

  const submit = async () => {
    if (!validateStep(1) || !validateStep(2)) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data } = await api.post<{ id: string }>(
        '/shipments',
        buildPayload(),
      );
      handleClose();
      router.push(`/shipments/${data.id}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string | string[] })
          ?.message;
        setSubmitError(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed to create shipment.',
        );
      } else {
        setSubmitError('Failed to create shipment.');
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
            <h2 className="text-lg font-bold text-[#07172E]">New Shipment</h2>
            <p className="text-xs text-gray-500">Step {step} of 3</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                s <= step ? 'bg-[#1559C9]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Transport Mode *</label>
                <div className="grid grid-cols-3 gap-3">
                  {MODES.map((m) => {
                    const active = form.mode === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => set('mode', m.value)}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 py-4 transition ${
                          active
                            ? 'border-[#1559C9] bg-[#1559C9]/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl">{m.emoji}</span>
                        <span className="text-sm font-medium text-gray-700">
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.mode && (
                  <p className="mt-1 text-xs text-red-600">{errors.mode}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Direction *</label>
                <div className="grid grid-cols-3 gap-3">
                  {DIRECTIONS.map((d) => {
                    const active = form.direction === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => set('direction', d.value)}
                        className={`rounded-xl border-2 py-2 text-sm font-medium transition ${
                          active
                            ? 'border-[#1559C9] bg-[#1559C9]/10 text-[#1559C9]'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {errors.direction && (
                  <p className="mt-1 text-xs text-red-600">{errors.direction}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Origin Port *</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. USNWK, JFK, Newark NJ"
                    value={form.originPort}
                    onChange={(e) => set('originPort', e.target.value)}
                  />
                  {errors.originPort && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.originPort}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Destination Port *</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. DEHAM, FRA, Chicago IL"
                    value={form.destinationPort}
                    onChange={(e) => set('destinationPort', e.target.value)}
                  />
                  {errors.destinationPort && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.destinationPort}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>ETD</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.etd}
                    onChange={(e) => set('etd', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>ETA</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.eta}
                    onChange={(e) => set('eta', e.target.value)}
                  />
                </div>
              </div>

              {form.mode === 'OCEAN' && (
                <div>
                  <label className={labelClass}>Vessel Name</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. MSC GÜLSÜN"
                    value={form.vesselName}
                    onChange={(e) => set('vesselName', e.target.value)}
                  />
                </div>
              )}

              {form.mode === 'AIR' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Flight Number</label>
                    <input
                      className={inputClass}
                      placeholder="e.g. LH401"
                      value={form.flightNumber}
                      onChange={(e) => set('flightNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>MAWB Number</label>
                    <input
                      className={inputClass}
                      placeholder="e.g. 020-12345678"
                      value={form.mawbNumber}
                      onChange={(e) => set('mawbNumber', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Goods Description *</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Describe the cargo…"
                  value={form.goodsDescription}
                  onChange={(e) => set('goodsDescription', e.target.value)}
                />
                {errors.goodsDescription && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.goodsDescription}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>HS Code</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. 8431.49"
                    value={form.hsCode}
                    onChange={(e) => set('hsCode', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Country of Origin</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. USA"
                    value={form.countryOfOrigin}
                    onChange={(e) => set('countryOfOrigin', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Gross Weight (kg) *</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.grossWeightKg}
                    onChange={(e) => set('grossWeightKg', e.target.value)}
                  />
                  {errors.grossWeightKg && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.grossWeightKg}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Volume (CBM)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.volumeCbm}
                    onChange={(e) => set('volumeCbm', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Number of Packages *</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.numPackages}
                    onChange={(e) => set('numPackages', e.target.value)}
                  />
                  {errors.numPackages && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.numPackages}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Package Type</label>
                  <select
                    className={inputClass}
                    value={form.packageType}
                    onChange={(e) => set('packageType', e.target.value)}
                  >
                    {PACKAGE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Declared Value (USD)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.declaredValueUsd}
                    onChange={(e) => set('declaredValueUsd', e.target.value)}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isHazmat}
                  onChange={(e) => set('isHazmat', e.target.checked)}
                />
                ☢️ Has Hazardous Goods
              </label>

              {form.isHazmat && (
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-red-200 bg-red-50/50 p-4">
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
                    <label className={labelClass}>Proper Shipping Name *</label>
                    <input
                      className={inputClass}
                      placeholder="e.g. ISOPROPANOL"
                      value={form.hazmatProperShippingName}
                      onChange={(e) =>
                        set('hazmatProperShippingName', e.target.value)
                      }
                    />
                    {errors.hazmatProperShippingName && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.hazmatProperShippingName}
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
                  <div>
                    <label className={labelClass}>Packing Group</label>
                    <select
                      className={inputClass}
                      value={form.hazmatPackingGroup}
                      onChange={(e) =>
                        set('hazmatPackingGroup', e.target.value)
                      }
                    >
                      <option value="">—</option>
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <PartyPicker
                role="SHIPPER"
                label="Shipper"
                required
                selectedName={shipperName}
                onSelect={(p) => {
                  set('shipperId', p.id);
                  setShipperName(p.name);
                }}
                onClear={() => {
                  set('shipperId', '');
                  setShipperName(null);
                }}
              />
              <PartyPicker
                role="CONSIGNEE"
                label="Consignee"
                selectedName={consigneeName}
                onSelect={(p) => {
                  set('consigneeId', p.id);
                  setConsigneeName(p.name);
                }}
                onClear={() => {
                  set('consigneeId', '');
                  setConsigneeName(null);
                }}
              />
              <PartyPicker
                role="NOTIFY_PARTY"
                label="Notify Party (optional)"
                selectedName={notifyName}
                onSelect={(p) => {
                  set('notifyPartyId', p.id);
                  setNotifyName(p.name);
                }}
                onClear={() => {
                  set('notifyPartyId', '');
                  setNotifyName(null);
                }}
              />
              {!form.shipperId && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  ⚠️ No shipper assigned. You can still create the shipment as a
                  DRAFT and assign one later.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={prev}
            disabled={step === 1}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-[#1559C9] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3]"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="rounded-lg bg-[#1559C9] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1148a3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create Shipment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
