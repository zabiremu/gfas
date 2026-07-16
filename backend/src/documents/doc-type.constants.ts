// Single source of truth for supported document types, spanning the BL,
// invoice, packing-list, and certificate categories. The frontend mirrors
// this list by hand in two places (no shared package between frontend and
// backend exists to eliminate the duplication) — keep them in sync:
//   - frontend/src/app/(dashboard)/documents/page.tsx (DOC_TYPE_OPTIONS)
//   - frontend/src/app/(dashboard)/shipments/[id]/page.tsx (DOC_TYPES)
export const DOC_TYPES = [
  { value: 'HOUSE_BILL_OF_LADING', label: 'House Bill of Lading' },
  { value: 'MASTER_BILL_OF_LADING', label: 'Master Bill of Lading' },
  { value: 'AIR_WAYBILL', label: 'Air Waybill' },
  { value: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice' },
  { value: 'PROFORMA_INVOICE', label: 'Proforma Invoice' },
  { value: 'PACKING_LIST', label: 'Packing List' },
  { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin' },
  { value: 'IMO_DGD', label: 'IMO Dangerous Goods Declaration' },
] as const;

export type DocType = (typeof DOC_TYPES)[number]['value'];
