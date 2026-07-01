export type ShipmentMode = 'OCEAN' | 'AIR' | 'INLAND';
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

export interface Shipment {
  id: string;
  shipmentNumber: string;
  mode: ShipmentMode;
  status: ShipmentStatus;
  originPort: string;
  destinationPort: string;
  etd?: string;
  eta?: string;
  vesselName?: string;
  flightNumber?: string;
  mawbNumber?: string;
  goodsDescription: string;
  hsCode?: string;
  countryOfOrigin?: string;
  grossWeightKg: number;
  volumeCbm?: number;
  numPackages: number;
  packageType: string;
  declaredValueUsd?: number;
  isHazmat: boolean;
  hazmatUnNumber?: string;
  hazmatProperShippingName?: string;
  hazmatClass?: string;
  hazmatPackingGroup?: string;
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
