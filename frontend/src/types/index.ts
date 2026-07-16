export type ShipmentMode = 'OCEAN' | 'AIR' | 'INLAND';
export type ShipmentDirection = 'IMPORT' | 'EXPORT' | 'DOMESTIC';
export type ShipmentStatus = 'DRAFT' | 'BOOKED' | 'IN_TRANSIT' | 'CUSTOMS_HOLD' | 'ARRIVED' | 'DELIVERED' | 'CANCELLED';
export type DocumentStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'SIGNED' | 'VOID';
export type PartyRole = 'SHIPPER' | 'CONSIGNEE' | 'NOTIFY_PARTY' | 'FREIGHT_FORWARDER' | 'CUSTOMS_BROKER';

export interface Party {
  id: string;
  name: string;
  role: PartyRole;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface CargoItem {
  id: string;
  shipmentId: string;
  goodsDescription: string;
  hsCode?: string | null;
  countryOfOrigin?: string | null;
  grossWeightKg: number;
  volumeCbm?: number | null;
  numPackages: number;
  packageType: string;
  declaredValueUsd?: number | null;
  isHazmat: boolean;
  hazmatUnNumber?: string | null;
  hazmatProperShippingName?: string | null;
  hazmatClass?: string | null;
  hazmatPackingGroup?: string | null;
  isPrimary: boolean;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  mode: ShipmentMode;
  direction?: ShipmentDirection | null;
  status: ShipmentStatus;
  originPort: string;
  destinationPort: string;
  etd?: string;
  eta?: string;
  vesselName?: string;
  flightNumber?: string;
  mawbNumber?: string;
  cargoItems?: CargoItem[];
  shipper?: Party;
  consignee?: Party;
  notifyParty?: Party;
  documents?: ShipmentDocument[];
  trackingEvents?: TrackingEvent[];
  createdAt: string;
}

export interface ShipmentDocument {
  id: string;
  docType: string;
  status: DocumentStatus;
  fileUrl?: string;
  version: number;
  generatedAt?: string;
  sentAt?: string;
  shipment?: Shipment;
}

export interface ShipmentParty {
  id: string;
  shipmentId: string;
  partyId: string;
  party: Party;
  role: PartyRole;
  isPrimary: boolean;
}

export interface TrackingEvent {
  id: string;
  eventCode: string;
  eventDescription: string;
  locationName?: string;
  lat?: number;
  lng?: number;
  eventTime: string;
  notes?: string;
}

export interface WarehouseFacility {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  capacityPallets?: number | null;
  isActive: boolean;
}

export type WarehouseStatus = 'IN_STORAGE' | 'RELEASED';

export interface MovementLogEntry {
  step?: number;
  action: string;
  location?: string | null;
  time?: string;
  loggedBy?: string;
  note?: string;
}

export interface WarehouseEntry {
  id: string;
  shipmentId?: string | null;
  customerName: string;
  batchNumber: string;
  lotNumber?: string | null;
  numPallets: number;
  weightKg: number;
  isHazmat: boolean;
  hazmatClass?: string | null;
  hazmatUnNumber?: string | null;
  zone?: string | null;
  aisle?: string | null;
  rack?: string | null;
  level?: string | null;
  tempMin?: number | null;
  tempMax?: number | null;
  storageStartDate: string;
  storageEndDate?: string | null;
  status: WarehouseStatus;
  movementLog?: MovementLogEntry[];
  releasedAt?: string | null;
  releasedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  activeShipments: number;
  inTransit: number;
  inTransitByMode: { OCEAN: number; AIR: number; INLAND: number };
  docsPending: number;
  customsHolds: number;
  recentShipments: Shipment[];
}
