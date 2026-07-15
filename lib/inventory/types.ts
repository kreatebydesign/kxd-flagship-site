/**
 * Phase 34B — Client Inventory Platform types (client-safe).
 */

export const INVENTORY_CONDITIONS = ["new", "used"] as const;
export type InventoryCondition = (typeof INVENTORY_CONDITIONS)[number];

export const INVENTORY_LISTING_STATUSES = [
  "draft",
  "available",
  "pending",
  "sold",
  "hidden",
  "coming_soon",
] as const;
export type InventoryListingStatus = (typeof INVENTORY_LISTING_STATUSES)[number];

export const INVENTORY_PRICE_DISPLAY_MODES = [
  "exact",
  "contact",
  "call",
  "hidden",
] as const;
export type InventoryPriceDisplayMode = (typeof INVENTORY_PRICE_DISPLAY_MODES)[number];

/** Derived for public DTO only — never stored. */
export const INVENTORY_GROUPS = ["new", "used", "coming_soon"] as const;
export type InventoryGroup = (typeof INVENTORY_GROUPS)[number];

export const PUBLIC_LISTABLE_STATUSES = [
  "available",
  "pending",
  "coming_soon",
] as const;
export type PublicListableStatus = (typeof PUBLIC_LISTABLE_STATUSES)[number];

export type InventoryMediaRef = {
  id: number;
  url: string;
  alt: string;
};

export type InventorySpecRow = {
  id?: string;
  label: string;
  value: string;
};

export type InventoryHighlightRow = {
  id?: string;
  text: string;
};

export type InventoryGalleryRow = {
  id?: string;
  image: number | InventoryMediaRef | null;
};

/** Operator / portal working record (includes private fields). */
export type InventoryVehicleRecord = {
  id: number;
  clientId: number;
  title: string;
  slug: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  condition: InventoryCondition;
  listingStatus: InventoryListingStatus;
  featured: boolean;
  price: number | null;
  priceDisplayMode: InventoryPriceDisplayMode;
  mileage: number | null;
  vin: string | null;
  stockNumber: string | null;
  summary: string | null;
  description: string | null;
  specifications: InventorySpecRow[];
  highlights: InventoryHighlightRow[];
  primaryImage: InventoryMediaRef | null;
  gallery: InventoryMediaRef[];
  sortOrder: number;
  publishedAt: string | null;
  soldAt: string | null;
  externalUrl: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

/** Public showroom client context (no private fields). */
export type PublicInventoryClient = {
  id: number;
  slug: string;
  name: string;
  website: string | null;
  contactEmail: string | null;
};

/** Stable public contract for external website consumption. */
export type PublicInventoryVehicle = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  condition: InventoryCondition;
  inventoryGroup: InventoryGroup;
  listingStatus: PublicListableStatus;
  featured: boolean;
  price: number | null;
  priceDisplayMode: InventoryPriceDisplayMode;
  mileage: number | null;
  stockNumber: string | null;
  summary: string | null;
  description: string | null;
  specifications: { label: string; value: string }[];
  highlights: string[];
  primaryImage: { url: string; alt: string } | null;
  gallery: { url: string; alt: string }[];
  sortOrder: number;
  publishedAt: string | null;
  externalUrl: string | null;
};

export type InventoryVehicleInput = {
  title: string;
  slug?: string;
  year?: number | null;
  make: string;
  model: string;
  trim?: string | null;
  condition: InventoryCondition;
  listingStatus?: InventoryListingStatus;
  featured?: boolean;
  price?: number | null;
  priceDisplayMode?: InventoryPriceDisplayMode;
  mileage?: number | null;
  vin?: string | null;
  stockNumber?: string | null;
  summary?: string | null;
  description?: string | null;
  specifications?: { label: string; value: string }[];
  highlights?: string[];
  primaryImageId?: number | null;
  galleryImageIds?: number[];
  sortOrder?: number;
  externalUrl?: string | null;
};
