/**
 * Read-only mapping from primalmotorsports.com inventory RSC payload
 * into canonical KXD inventory inputs. Does not invent missing VIN/price/mileage.
 */

import { normalizeInventorySlug } from "./slug";
import { normalizeInventorySourceIdentity } from "./source";
import {
  isReusablePrimalWebsiteMediaUrl,
} from "./referenced-media";
import type {
  InventoryCondition,
  InventoryListingStatus,
  InventoryPriceDisplayMode,
  InventoryVehicleInput,
} from "./types";

export const PRIMAL_WEBSITE_INVENTORY_ORIGIN = "https://www.primalmotorsports.com";
export const PRIMAL_WEBSITE_INVENTORY_PATH = "/inventory";
export const PRIMAL_WEBSITE_SOURCE_SYSTEM = "primal-website";

export type PrimalWebsiteMediaRef = {
  src: string;
  alt: string | null;
  isPrimary: boolean;
};

export type PrimalWebsiteVehicle = {
  id: string;
  model: string;
  variant: string;
  condition: InventoryCondition;
  status: string | null;
  listingStatus: string | null;
  year: number | null;
  chassisNumber: string | null;
  askingPriceCents: number | null;
  spec: string | null;
  positioning: string | null;
  summary: string | null;
  exteriorColor: string | null;
  engine: string | null;
  displacement: string | null;
  highlights: string[];
  mediaRefs: PrimalWebsiteMediaRef[];
  publicPath: string | null;
};

export type PrimalWebsiteInventoryManifest = {
  origin: string;
  listingUrl: string;
  publicPaths: string[];
  vehicles: PrimalWebsiteVehicle[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function walk(value: unknown, visit: (node: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  const rec = asRecord(value);
  if (!rec) return;
  visit(rec);
  for (const nested of Object.values(rec)) walk(nested, visit);
}

function parseFlightScripts(html: string): unknown[] {
  const scripts: unknown[] = [];
  const re = /<script[^>]*>self\.__next_f\.push\(([\s\S]*?)\)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      scripts.push(JSON.parse(match[1] ?? "null"));
    } catch {
      /* ignore malformed flight chunks */
    }
  }
  return scripts;
}

function extractFlightJson(entry: unknown): unknown {
  if (!Array.isArray(entry) || typeof entry[1] !== "string") return null;
  const inner = entry[1];
  const colon = inner.indexOf(":");
  if (colon < 0) return null;
  try {
    return JSON.parse(inner.slice(colon + 1));
  } catch {
    return null;
  }
}

function collectVehicleArrays(root: unknown): unknown[][] {
  const found: unknown[][] = [];
  walk(root, (node) => {
    if (Array.isArray(node.vehicles) && node.vehicles.length > 0) {
      found.push(node.vehicles);
    }
  });
  return found;
}

function parseMediaRefs(value: unknown): PrimalWebsiteMediaRef[] {
  if (!Array.isArray(value)) return [];
  const out: PrimalWebsiteMediaRef[] = [];
  for (const item of value) {
    const rec = asRecord(item);
    const src = rec ? asTrimmedString(rec.src) : null;
    if (!src || !src.startsWith("/")) continue;
    out.push({
      src,
      alt: rec ? asTrimmedString(rec.alt) : null,
      isPrimary: rec?.isPrimary === true,
    });
  }
  return out;
}

function parseCondition(value: unknown): InventoryCondition | null {
  const raw = asTrimmedString(value)?.toLowerCase();
  if (raw === "new" || raw === "used") return raw;
  return null;
}

export function mapPrimalWebsiteListingStatus(input: {
  listingStatus: string | null;
  status: string | null;
}): InventoryListingStatus {
  const listing = (input.listingStatus ?? "").toLowerCase();
  const status = (input.status ?? "").toLowerCase();
  if (listing === "coming_soon") return "coming_soon";
  if (listing === "live" && status === "available") return "available";
  if (listing === "paused") return "coming_soon";
  if (status === "reserved") return "coming_soon";
  return "draft";
}

function trimFromVariant(variant: string, model: string): string | null {
  let rest = variant.replace(/^radical\s+/i, "").trim();
  if (model && rest.toLowerCase().startsWith(model.toLowerCase())) {
    rest = rest.slice(model.length).trim();
  }
  return rest.length > 0 ? rest : null;
}

export function mapPrimalWebsiteVehicle(input: {
  vehicle: PrimalWebsiteVehicle;
  origin?: string;
}): {
  sourceSystem: string;
  sourceExternalId: string;
  data: InventoryVehicleInput;
} | null {
  const source = normalizeInventorySourceIdentity({
    sourceSystem: PRIMAL_WEBSITE_SOURCE_SYSTEM,
    sourceExternalId: input.vehicle.id,
  });
  if (!source) return null;

  const origin = (input.origin ?? PRIMAL_WEBSITE_INVENTORY_ORIGIN).replace(/\/$/, "");
  const variant = input.vehicle.variant;
  const model = input.vehicle.model;
  const makeMatch = variant.match(/^([A-Za-z]+)\b/);
  const make = makeMatch?.[1] ?? null;
  if (!make) return null;

  const priceCents = input.vehicle.askingPriceCents;
  const hasPrice = priceCents != null && Number.isFinite(priceCents);
  const price = hasPrice ? Math.round(priceCents / 100) : null;
  const priceDisplayMode: InventoryPriceDisplayMode = hasPrice ? "exact" : "contact";

  const specs: { label: string; value: string }[] = [];
  if (input.vehicle.chassisNumber) {
    specs.push({ label: "Chassis", value: `#${input.vehicle.chassisNumber}` });
  }
  if (input.vehicle.exteriorColor) {
    specs.push({ label: "Exterior", value: input.vehicle.exteriorColor });
  }
  if (input.vehicle.engine) {
    specs.push({ label: "Engine", value: input.vehicle.engine });
  }
  if (
    input.vehicle.displacement &&
    input.vehicle.displacement !== input.vehicle.engine
  ) {
    specs.push({ label: "Displacement", value: input.vehicle.displacement });
  }
  if (input.vehicle.spec) {
    specs.push({ label: "Listing note", value: input.vehicle.spec });
  }

  const publicPath = input.vehicle.publicPath ?? PRIMAL_WEBSITE_INVENTORY_PATH;
  const listingStatus = mapPrimalWebsiteListingStatus({
    listingStatus: input.vehicle.listingStatus,
    status: input.vehicle.status,
  });

  const media = input.vehicle.mediaRefs
    .map((ref) => {
      const url = primalWebsiteImageUrl(ref.src, origin);
      if (!isReusablePrimalWebsiteMediaUrl(url)) return null;
      return {
        url,
        alt: ref.alt || variant,
        isPrimary: ref.isPrimary,
      };
    })
    .filter((row): row is { url: string; alt: string; isPrimary: boolean } => Boolean(row));
  const primary = media.find((row) => row.isPrimary) ?? media[0] ?? null;
  const referencedMedia = {
    primary: primary ? { url: primary.url, alt: primary.alt } : null,
    gallery: media
      .filter((row) => row.url !== primary?.url)
      .map((row) => ({ url: row.url, alt: row.alt })),
  };

  return {
    sourceSystem: source.sourceSystem,
    sourceExternalId: source.sourceExternalId,
    data: {
      title: variant,
      slug: normalizeInventorySlug(input.vehicle.id),
      year: input.vehicle.year,
      make,
      model,
      trim: trimFromVariant(variant, model),
      condition: input.vehicle.condition,
      listingStatus,
      featured: false,
      price,
      priceDisplayMode,
      mileage: null,
      vin: null,
      stockNumber: input.vehicle.chassisNumber,
      summary: input.vehicle.summary ?? input.vehicle.spec,
      description: input.vehicle.positioning,
      specifications: specs,
      highlights: input.vehicle.highlights,
      sortOrder: 0,
      externalUrl: `${origin}${publicPath.startsWith("/") ? publicPath : `/${publicPath}`}`,
      referencedMedia,
    },
  };
}

export function parsePrimalWebsiteInventoryHtml(
  html: string,
  options?: { origin?: string },
): PrimalWebsiteInventoryManifest {
  const origin = (options?.origin ?? PRIMAL_WEBSITE_INVENTORY_ORIGIN).replace(/\/$/, "");
  const publicPaths = [
    ...new Set(
      [...html.matchAll(/href="(\/inventory\/veh_[^"#]+)"/g)].map((m) => m[1]!),
    ),
  ].sort();
  const detail = new Set(publicPaths);

  const vehicles: PrimalWebsiteVehicle[] = [];
  const seen = new Set<string>();
  for (const script of parseFlightScripts(html)) {
    const flight = extractFlightJson(script);
    for (const group of collectVehicleArrays(flight)) {
      for (const raw of group) {
        const rec = asRecord(raw);
        const id = rec ? asTrimmedString(rec.id) : null;
        const variant = rec ? asTrimmedString(rec.variant) : null;
        const model = rec ? asTrimmedString(rec.model) : null;
        const condition = rec ? parseCondition(rec.condition) : null;
        if (!id || !id.startsWith("veh_") || !variant || !model || !condition) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        vehicles.push({
          id,
          model,
          variant,
          condition,
          status: rec ? asTrimmedString(rec.status) : null,
          listingStatus: rec ? asTrimmedString(rec.listingStatus) : null,
          year: rec ? asFiniteNumber(rec.year) : null,
          chassisNumber: rec ? asTrimmedString(rec.chassisNumber) : null,
          askingPriceCents: rec ? asFiniteNumber(rec.askingPriceCents) : null,
          spec: rec ? asTrimmedString(rec.spec) : null,
          positioning: rec ? asTrimmedString(rec.positioning) : null,
          summary: rec ? asTrimmedString(rec.summary) : null,
          exteriorColor: rec ? asTrimmedString(rec.exteriorColor) : null,
          engine: rec ? asTrimmedString(rec.engine) : null,
          displacement: rec ? asTrimmedString(rec.displacement) : null,
          highlights: Array.isArray(rec?.highlights)
            ? rec.highlights
                .map((row) => asTrimmedString(row))
                .filter((row): row is string => Boolean(row))
            : [],
          mediaRefs: parseMediaRefs(rec?.mediaRefs),
          publicPath: detail.has(`/inventory/${id}`)
            ? `/inventory/${id}`
            : PRIMAL_WEBSITE_INVENTORY_PATH,
        });
      }
    }
  }

  return {
    origin,
    listingUrl: `${origin}${PRIMAL_WEBSITE_INVENTORY_PATH}`,
    publicPaths,
    vehicles,
  };
}

export function primalWebsiteImageUrl(src: string, origin = PRIMAL_WEBSITE_INVENTORY_ORIGIN): string {
  const base = origin.replace(/\/$/, "");
  const path = src
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")
    .replace(/%2F/g, "/");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
