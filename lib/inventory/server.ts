import "server-only";

import type { Payload } from "payload";
import { INVENTORY_COLLECTION } from "./constants";
import { parseInventoryVehicleDoc } from "./parse";
import { toPublicInventoryVehicle } from "./public-map";
import {
  normalizeInventoryInput,
  validateInventoryInput,
} from "./validate";
import type {
  InventoryListingStatus,
  InventoryVehicleInput,
  InventoryVehicleRecord,
  PublicInventoryVehicle,
} from "./types";

type AnyDoc = Record<string, unknown>;

function statusTimestamps(
  nextStatus: InventoryListingStatus,
  previous?: InventoryVehicleRecord | null,
): { publishedAt?: string | null; soldAt?: string | null } {
  const now = new Date().toISOString();
  const patch: { publishedAt?: string | null; soldAt?: string | null } = {};

  if (
    (nextStatus === "available" ||
      nextStatus === "pending" ||
      nextStatus === "coming_soon") &&
    !previous?.publishedAt
  ) {
    patch.publishedAt = now;
  }
  if (nextStatus === "draft" || nextStatus === "hidden") {
    // keep publishedAt history; do not clear
  }
  if (nextStatus === "sold") {
    patch.soldAt = previous?.soldAt ?? now;
    if (!previous?.publishedAt) patch.publishedAt = previous?.publishedAt ?? now;
  }
  return patch;
}

export async function listInventoryForClient(
  payload: Payload,
  clientId: number,
  options?: {
    status?: InventoryListingStatus | "all";
    search?: string;
    limit?: number;
  },
): Promise<InventoryVehicleRecord[]> {
  const where: Record<string, unknown> = {
    client: { equals: clientId },
  };
  if (options?.status && options.status !== "all") {
    where.listingStatus = { equals: options.status };
  }
  if (options?.search?.trim()) {
    const q = options.search.trim();
    where.or = [
      { title: { contains: q } },
      { make: { contains: q } },
      { model: { contains: q } },
      { stockNumber: { contains: q } },
      { slug: { contains: q } },
    ];
  }

  const result = await payload.find({
    collection: INVENTORY_COLLECTION as never,
    where: where as never,
    depth: 2,
    limit: options?.limit ?? 200,
    sort: "sortOrder",
    overrideAccess: true,
  });

  return result.docs
    .map((doc) => parseInventoryVehicleDoc(doc))
    .filter((row): row is InventoryVehicleRecord => Boolean(row));
}

export async function getInventoryVehicleForClient(
  payload: Payload,
  clientId: number,
  vehicleId: number,
): Promise<InventoryVehicleRecord | null> {
  try {
    const doc = await payload.findByID({
      collection: INVENTORY_COLLECTION as never,
      id: vehicleId,
      depth: 2,
      overrideAccess: true,
    });
    const parsed = parseInventoryVehicleDoc(doc);
    if (!parsed || parsed.clientId !== clientId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function assertSlugAvailable(
  payload: Payload,
  clientId: number,
  slug: string,
  excludeId?: number,
): Promise<boolean> {
  const result = await payload.find({
    collection: INVENTORY_COLLECTION as never,
    where: {
      and: [
        { client: { equals: clientId } },
        { slug: { equals: slug } },
        ...(excludeId
          ? [{ id: { not_equals: excludeId } }]
          : []),
      ],
    } as never,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.length === 0;
}

export async function createInventoryVehicle(
  payload: Payload,
  input: {
    clientId: number;
    data: InventoryVehicleInput;
    actor: string;
  },
): Promise<{ ok: true; vehicle: InventoryVehicleRecord } | { ok: false; message: string; issues?: unknown }> {
  const issues = validateInventoryInput(input.data);
  if (issues.length) {
    return { ok: false, message: issues[0]?.message ?? "Invalid vehicle.", issues };
  }
  const normalized = normalizeInventoryInput(input.data);
  const available = await assertSlugAvailable(
    payload,
    input.clientId,
    normalized.slug,
  );
  if (!available) {
    return { ok: false, message: "That slug is already in use for this client." };
  }

  const listingStatus = normalized.listingStatus ?? "draft";
  const stamps = statusTimestamps(listingStatus);

  const created = await payload.create({
    collection: INVENTORY_COLLECTION as never,
    data: {
      client: input.clientId,
      title: normalized.title,
      slug: normalized.slug,
      year: normalized.year ?? undefined,
      make: normalized.make,
      model: normalized.model,
      trim: normalized.trim ?? undefined,
      condition: normalized.condition,
      listingStatus,
      featured: normalized.featured ?? false,
      price: normalized.price ?? undefined,
      priceDisplayMode: normalized.priceDisplayMode ?? "exact",
      mileage: normalized.mileage ?? undefined,
      vin: normalized.vin ?? undefined,
      stockNumber: normalized.stockNumber ?? undefined,
      summary: normalized.summary ?? undefined,
      description: normalized.description ?? undefined,
      specifications: normalized.specifications,
      highlights: (normalized.highlights ?? []).map((text) => ({ text })),
      primaryImage: normalized.primaryImageId ?? undefined,
      gallery: (normalized.galleryImageIds ?? []).map((image) => ({ image })),
      sortOrder: normalized.sortOrder ?? 0,
      externalUrl: normalized.externalUrl ?? undefined,
      publishedAt: stamps.publishedAt,
      soldAt: stamps.soldAt,
      createdBy: input.actor,
      updatedBy: input.actor,
    } as never,
    depth: 2,
    overrideAccess: true,
  });

  const vehicle = parseInventoryVehicleDoc(created);
  if (!vehicle) return { ok: false, message: "Could not parse created vehicle." };
  return { ok: true, vehicle };
}

export async function updateInventoryVehicle(
  payload: Payload,
  input: {
    clientId: number;
    vehicleId: number;
    data: Partial<InventoryVehicleInput> & { listingStatus?: InventoryListingStatus };
    actor: string;
  },
): Promise<{ ok: true; vehicle: InventoryVehicleRecord } | { ok: false; message: string }> {
  const existing = await getInventoryVehicleForClient(
    payload,
    input.clientId,
    input.vehicleId,
  );
  if (!existing) return { ok: false, message: "Vehicle not found." };

  const merged: InventoryVehicleInput = {
    title: input.data.title ?? existing.title,
    slug: input.data.slug ?? existing.slug,
    year: input.data.year !== undefined ? input.data.year : existing.year,
    make: input.data.make ?? existing.make,
    model: input.data.model ?? existing.model,
    trim: input.data.trim !== undefined ? input.data.trim : existing.trim,
    condition: input.data.condition ?? existing.condition,
    listingStatus: input.data.listingStatus ?? existing.listingStatus,
    featured: input.data.featured ?? existing.featured,
    price: input.data.price !== undefined ? input.data.price : existing.price,
    priceDisplayMode: input.data.priceDisplayMode ?? existing.priceDisplayMode,
    mileage:
      input.data.mileage !== undefined ? input.data.mileage : existing.mileage,
    vin: input.data.vin !== undefined ? input.data.vin : existing.vin,
    stockNumber:
      input.data.stockNumber !== undefined
        ? input.data.stockNumber
        : existing.stockNumber,
    summary:
      input.data.summary !== undefined ? input.data.summary : existing.summary,
    description:
      input.data.description !== undefined
        ? input.data.description
        : existing.description,
    specifications:
      input.data.specifications ??
      existing.specifications.map((row) => ({
        label: row.label,
        value: row.value,
      })),
    highlights:
      input.data.highlights ?? existing.highlights.map((row) => row.text),
    primaryImageId:
      input.data.primaryImageId !== undefined
        ? input.data.primaryImageId
        : existing.primaryImage?.id ?? null,
    galleryImageIds:
      input.data.galleryImageIds ?? existing.gallery.map((image) => image.id),
    sortOrder:
      input.data.sortOrder !== undefined
        ? input.data.sortOrder
        : existing.sortOrder,
    externalUrl:
      input.data.externalUrl !== undefined
        ? input.data.externalUrl
        : existing.externalUrl,
  };

  const issues = validateInventoryInput(merged);
  if (issues.length) {
    return { ok: false, message: issues[0]?.message ?? "Invalid vehicle." };
  }
  const normalized = normalizeInventoryInput(merged);
  const available = await assertSlugAvailable(
    payload,
    input.clientId,
    normalized.slug,
    input.vehicleId,
  );
  if (!available) {
    return { ok: false, message: "That slug is already in use for this client." };
  }

  const listingStatus = normalized.listingStatus ?? existing.listingStatus;
  const stamps = statusTimestamps(listingStatus, existing);

  const updated = await payload.update({
    collection: INVENTORY_COLLECTION as never,
    id: input.vehicleId,
    data: {
      title: normalized.title,
      slug: normalized.slug,
      year: normalized.year ?? null,
      make: normalized.make,
      model: normalized.model,
      trim: normalized.trim ?? null,
      condition: normalized.condition,
      listingStatus,
      featured: normalized.featured ?? false,
      price: normalized.price ?? null,
      priceDisplayMode: normalized.priceDisplayMode ?? "exact",
      mileage: normalized.mileage ?? null,
      vin: normalized.vin ?? null,
      stockNumber: normalized.stockNumber ?? null,
      summary: normalized.summary ?? null,
      description: normalized.description ?? null,
      specifications: normalized.specifications,
      highlights: (normalized.highlights ?? []).map((text) => ({ text })),
      primaryImage: normalized.primaryImageId ?? null,
      gallery: (normalized.galleryImageIds ?? []).map((image) => ({ image })),
      sortOrder: normalized.sortOrder ?? 0,
      externalUrl: normalized.externalUrl ?? null,
      ...(stamps.publishedAt !== undefined
        ? { publishedAt: stamps.publishedAt }
        : {}),
      ...(stamps.soldAt !== undefined ? { soldAt: stamps.soldAt } : {}),
      updatedBy: input.actor,
    } as never,
    depth: 2,
    overrideAccess: true,
  });

  const vehicle = parseInventoryVehicleDoc(updated);
  if (!vehicle) return { ok: false, message: "Could not parse updated vehicle." };
  return { ok: true, vehicle };
}

export async function duplicateInventoryVehicle(
  payload: Payload,
  input: { clientId: number; vehicleId: number; actor: string },
): Promise<{ ok: true; vehicle: InventoryVehicleRecord } | { ok: false; message: string }> {
  const existing = await getInventoryVehicleForClient(
    payload,
    input.clientId,
    input.vehicleId,
  );
  if (!existing) return { ok: false, message: "Vehicle not found." };

  const baseSlug = `${existing.slug}-copy`;
  let slug = baseSlug;
  let n = 2;
  while (!(await assertSlugAvailable(payload, input.clientId, slug))) {
    slug = `${baseSlug}-${n}`;
    n += 1;
    if (n > 50) return { ok: false, message: "Could not allocate a unique slug." };
  }

  return createInventoryVehicle(payload, {
    clientId: input.clientId,
    actor: input.actor,
    data: {
      title: `${existing.title} (Copy)`,
      slug,
      year: existing.year,
      make: existing.make,
      model: existing.model,
      trim: existing.trim,
      condition: existing.condition,
      listingStatus: "draft",
      featured: false,
      price: existing.price,
      priceDisplayMode: existing.priceDisplayMode,
      mileage: existing.mileage,
      vin: null,
      stockNumber: existing.stockNumber
        ? `${existing.stockNumber}-COPY`
        : null,
      summary: existing.summary,
      description: existing.description,
      specifications: existing.specifications.map((row) => ({
        label: row.label,
        value: row.value,
      })),
      highlights: existing.highlights.map((row) => row.text),
      primaryImageId: existing.primaryImage?.id ?? null,
      galleryImageIds: existing.gallery.map((image) => image.id),
      sortOrder: existing.sortOrder + 1,
      externalUrl: existing.externalUrl,
    },
  });
}

export async function listPublicInventory(
  payload: Payload,
  clientSlug: string,
  options?: { group?: "new" | "used" | "coming_soon"; featured?: boolean },
): Promise<PublicInventoryVehicle[]> {
  const clients = await payload.find({
    collection: "clients",
    where: { slug: { equals: clientSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const client = clients.docs[0] as unknown as AnyDoc | undefined;
  const clientId = client ? Number(client.id) : null;
  if (!clientId) return [];

  const rows = await listInventoryForClient(payload, clientId, { limit: 500 });
  let publicRows = rows
    .map((row) => toPublicInventoryVehicle(row))
    .filter((row): row is PublicInventoryVehicle => Boolean(row));

  if (options?.group) {
    publicRows = publicRows.filter((row) => row.inventoryGroup === options.group);
  }
  if (options?.featured) {
    publicRows = publicRows.filter((row) => row.featured);
  }

  return publicRows.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.title.localeCompare(b.title);
  });
}

export async function getPublicInventoryVehicle(
  payload: Payload,
  clientSlug: string,
  vehicleSlug: string,
): Promise<PublicInventoryVehicle | null> {
  const list = await listPublicInventory(payload, clientSlug);
  return list.find((row) => row.slug === vehicleSlug) ?? null;
}
