import { resolveMediaPath } from "./media";
import type {
  InventoryCondition,
  InventoryListingStatus,
  InventoryPriceDisplayMode,
  InventoryVehicleRecord,
} from "./types";
import {
  INVENTORY_CONDITIONS,
  INVENTORY_LISTING_STATUSES,
  INVENTORY_PRICE_DISPLAY_MODES,
} from "./types";

type AnyDoc = Record<string, unknown>;

function asDoc(value: unknown): AnyDoc | null {
  return value && typeof value === "object" ? (value as AnyDoc) : null;
}

function relationId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const doc = asDoc(value);
  if (!doc) return null;
  const id = Number(doc.id);
  return Number.isFinite(id) ? id : null;
}

function mediaRef(value: unknown) {
  const resolved = resolveMediaPath(value, "card");
  if (!resolved) return null;
  return {
    id: resolved.id,
    url: resolved.path,
    alt: resolved.alt,
  };
}

function asCondition(value: unknown): InventoryCondition {
  return INVENTORY_CONDITIONS.includes(value as InventoryCondition)
    ? (value as InventoryCondition)
    : "used";
}

function asStatus(value: unknown): InventoryListingStatus {
  return INVENTORY_LISTING_STATUSES.includes(value as InventoryListingStatus)
    ? (value as InventoryListingStatus)
    : "draft";
}

function asPriceMode(value: unknown): InventoryPriceDisplayMode {
  return INVENTORY_PRICE_DISPLAY_MODES.includes(
    value as InventoryPriceDisplayMode,
  )
    ? (value as InventoryPriceDisplayMode)
    : "exact";
}

export function parseInventoryVehicleDoc(
  raw: unknown,
): InventoryVehicleRecord | null {
  const doc = asDoc(raw);
  if (!doc) return null;
  const id = Number(doc.id);
  const clientId = relationId(doc.client);
  if (!Number.isFinite(id) || clientId == null) return null;

  const specifications = Array.isArray(doc.specifications)
    ? doc.specifications
        .map((row) => {
          const item = asDoc(row);
          if (!item) return null;
          const label = String(item.label ?? "").trim();
          const value = String(item.value ?? "").trim();
          if (!label || !value) return null;
          return {
            id: item.id ? String(item.id) : undefined,
            label,
            value,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
    : [];

  const highlights = Array.isArray(doc.highlights)
    ? doc.highlights
        .map((row) => {
          const item = asDoc(row);
          if (!item) return null;
          const text = String(item.text ?? "").trim();
          if (!text) return null;
          return {
            id: item.id ? String(item.id) : undefined,
            text,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
    : [];

  const gallery = Array.isArray(doc.gallery)
    ? doc.gallery
        .map((row) => {
          const item = asDoc(row);
          if (!item) return null;
          return mediaRef(item.image);
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
    : [];

  return {
    id,
    clientId,
    title: String(doc.title ?? "").trim(),
    slug: String(doc.slug ?? "").trim(),
    year:
      doc.year == null || doc.year === ""
        ? null
        : Number.isFinite(Number(doc.year))
          ? Number(doc.year)
          : null,
    make: String(doc.make ?? "").trim(),
    model: String(doc.model ?? "").trim(),
    trim: doc.trim ? String(doc.trim).trim() : null,
    condition: asCondition(doc.condition),
    listingStatus: asStatus(doc.listingStatus),
    featured: Boolean(doc.featured),
    price:
      doc.price == null || doc.price === ""
        ? null
        : Number.isFinite(Number(doc.price))
          ? Number(doc.price)
          : null,
    priceDisplayMode: asPriceMode(doc.priceDisplayMode),
    mileage:
      doc.mileage == null || doc.mileage === ""
        ? null
        : Number.isFinite(Number(doc.mileage))
          ? Number(doc.mileage)
          : null,
    vin: doc.vin ? String(doc.vin).trim() : null,
    stockNumber: doc.stockNumber ? String(doc.stockNumber).trim() : null,
    summary: doc.summary ? String(doc.summary).trim() : null,
    description: doc.description ? String(doc.description).trim() : null,
    specifications,
    highlights,
    primaryImage: mediaRef(doc.primaryImage),
    gallery,
    sortOrder: Number.isFinite(Number(doc.sortOrder))
      ? Number(doc.sortOrder)
      : 0,
    publishedAt: doc.publishedAt ? String(doc.publishedAt) : null,
    soldAt: doc.soldAt ? String(doc.soldAt) : null,
    externalUrl: doc.externalUrl ? String(doc.externalUrl).trim() : null,
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    createdAt: doc.createdAt ? String(doc.createdAt) : null,
    updatedAt: doc.updatedAt ? String(doc.updatedAt) : null,
  };
}
