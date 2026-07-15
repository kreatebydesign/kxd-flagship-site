/**
 * Phase 34C — shared presentation helpers for portal + public inventory.
 * Display-only; does not change persistence rules.
 */

import {
  CONDITION_LABELS,
  LISTING_STATUS_LABELS,
  PRICE_MODE_LABELS,
} from "./constants";
import type {
  InventoryListingStatus,
  InventoryPriceDisplayMode,
  PublicInventoryVehicle,
} from "./types";

export type InventoryStatusTone =
  | "received"
  | "review"
  | "progress"
  | "input"
  | "complete"
  | "closed";

const STATUS_TONE: Record<InventoryListingStatus, InventoryStatusTone> = {
  draft: "received",
  available: "complete",
  pending: "input",
  coming_soon: "review",
  sold: "closed",
  hidden: "received",
};

/** Contextual status transitions (excludes current status). */
const STATUS_TRANSITIONS: Record<
  InventoryListingStatus,
  InventoryListingStatus[]
> = {
  draft: ["available", "coming_soon", "hidden"],
  available: ["pending", "sold", "hidden", "coming_soon"],
  pending: ["available", "sold", "hidden"],
  coming_soon: ["available", "pending", "hidden"],
  sold: ["available", "hidden"],
  hidden: ["draft", "available", "coming_soon"],
};

export function inventoryStatusLabel(status: string): string {
  return LISTING_STATUS_LABELS[status] ?? status;
}

export function inventoryStatusTone(
  status: InventoryListingStatus | string,
): InventoryStatusTone {
  return STATUS_TONE[status as InventoryListingStatus] ?? "received";
}

export function inventoryStatusTransitions(
  status: InventoryListingStatus,
): InventoryListingStatus[] {
  return STATUS_TRANSITIONS[status] ?? [];
}

export function formatInventoryPrice(input: {
  price: number | null;
  priceDisplayMode: InventoryPriceDisplayMode | string;
}): string {
  if (input.priceDisplayMode === "exact" && input.price != null) {
    return `$${input.price.toLocaleString("en-US")}`;
  }
  if (input.priceDisplayMode === "contact") return "Contact for price";
  if (input.priceDisplayMode === "call") return "Call for price";
  if (input.priceDisplayMode === "hidden") return "Price on request";
  return PRICE_MODE_LABELS[input.priceDisplayMode] ?? "Price on request";
}

export function formatInventoryIdentity(input: {
  year: number | null;
  make: string;
  model: string;
  trim?: string | null;
  condition?: string;
}): string {
  const year = input.year != null ? `${input.year} ` : "";
  const trim = input.trim ? ` ${input.trim}` : "";
  const condition = input.condition
    ? `${CONDITION_LABELS[input.condition] ?? input.condition} · `
    : "";
  return `${condition}${year}${input.make} ${input.model}${trim}`.trim();
}

export function inventoryGroupLabel(group: string): string {
  if (group === "new") return "New";
  if (group === "used") return "Pre-owned";
  if (group === "coming_soon") return "Coming soon";
  return group;
}

export function buildInventorySeo(vehicle: PublicInventoryVehicle, clientName: string) {
  const identity = formatInventoryIdentity(vehicle);
  const price = formatInventoryPrice(vehicle);
  const description =
    vehicle.summary?.trim() ||
    `${identity} available from ${clientName}. ${price}.`;
  return {
    title: `${vehicle.title} · ${clientName}`,
    description: description.slice(0, 160),
    ogImageUrl: vehicle.primaryImage?.url ?? null,
  };
}

/** schema.org Car + Offer — VIN never included. */
export function buildInventoryVehicleJsonLd(input: {
  vehicle: PublicInventoryVehicle;
  clientName: string;
  pageUrl: string;
}) {
  const { vehicle, clientName, pageUrl } = input;
  const priceValid =
    vehicle.priceDisplayMode === "exact" && vehicle.price != null;

  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: vehicle.title,
    brand: { "@type": "Brand", name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: vehicle.year != null ? String(vehicle.year) : undefined,
    mileageFromOdometer:
      vehicle.mileage != null
        ? {
            "@type": "QuantitativeValue",
            value: vehicle.mileage,
            unitCode: "SMI",
          }
        : undefined,
    description: vehicle.summary ?? vehicle.description ?? undefined,
    image: [
      vehicle.primaryImage?.url,
      ...vehicle.gallery.map((image) => image.url),
    ].filter(Boolean),
    url: pageUrl,
    itemCondition:
      vehicle.condition === "new"
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url: pageUrl,
      availability:
        vehicle.listingStatus === "available"
          ? "https://schema.org/InStock"
          : vehicle.listingStatus === "pending"
            ? "https://schema.org/LimitedAvailability"
            : "https://schema.org/PreOrder",
      price: priceValid ? vehicle.price : undefined,
      priceCurrency: priceValid ? "USD" : undefined,
      seller: {
        "@type": "AutoDealer",
        name: clientName,
      },
    },
  };
}
