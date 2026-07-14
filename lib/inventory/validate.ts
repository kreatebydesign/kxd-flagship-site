import {
  INVENTORY_CONDITIONS,
  INVENTORY_LISTING_STATUSES,
  INVENTORY_PRICE_DISPLAY_MODES,
  type InventoryVehicleInput,
} from "./types";
import { normalizeInventorySlug, suggestInventorySlug } from "./slug";

export type InventoryValidationIssue = {
  field: string;
  message: string;
};

export function validateInventoryInput(
  input: InventoryVehicleInput,
): InventoryValidationIssue[] {
  const issues: InventoryValidationIssue[] = [];

  if (!input.title?.trim()) {
    issues.push({ field: "title", message: "Title is required." });
  }
  if (!input.make?.trim()) {
    issues.push({ field: "make", message: "Make is required." });
  }
  if (!input.model?.trim()) {
    issues.push({ field: "model", message: "Model is required." });
  }
  if (!INVENTORY_CONDITIONS.includes(input.condition)) {
    issues.push({ field: "condition", message: "Condition must be new or used." });
  }
  if (
    input.listingStatus &&
    !INVENTORY_LISTING_STATUSES.includes(input.listingStatus)
  ) {
    issues.push({ field: "listingStatus", message: "Invalid listing status." });
  }
  if (
    input.priceDisplayMode &&
    !INVENTORY_PRICE_DISPLAY_MODES.includes(input.priceDisplayMode)
  ) {
    issues.push({
      field: "priceDisplayMode",
      message: "Invalid price display mode.",
    });
  }
  if (input.year != null && (!Number.isFinite(input.year) || input.year < 1900 || input.year > 2100)) {
    issues.push({ field: "year", message: "Year must be realistic." });
  }
  if (input.price != null && (!Number.isFinite(input.price) || input.price < 0)) {
    issues.push({ field: "price", message: "Price must be zero or greater." });
  }
  if (
    input.mileage != null &&
    (!Number.isFinite(input.mileage) || input.mileage < 0)
  ) {
    issues.push({ field: "mileage", message: "Mileage must be zero or greater." });
  }
  if (input.externalUrl?.trim()) {
    try {
      // eslint-disable-next-line no-new
      new URL(input.externalUrl.trim());
    } catch {
      issues.push({ field: "externalUrl", message: "External URL must be valid." });
    }
  }

  const slug = normalizeInventorySlug(
    input.slug?.trim() ||
      suggestInventorySlug({
        year: input.year,
        make: input.make,
        model: input.model,
        trim: input.trim,
        title: input.title,
      }),
  );
  if (!slug) {
    issues.push({ field: "slug", message: "Slug is required." });
  }

  return issues;
}

export function normalizeInventoryInput(
  input: InventoryVehicleInput,
): InventoryVehicleInput & { slug: string } {
  const slug = normalizeInventorySlug(
    input.slug?.trim() ||
      suggestInventorySlug({
        year: input.year,
        make: input.make,
        model: input.model,
        trim: input.trim,
        title: input.title,
      }),
  );

  return {
    ...input,
    title: input.title.trim(),
    make: input.make.trim(),
    model: input.model.trim(),
    trim: input.trim?.trim() || null,
    slug,
    vin: input.vin?.trim() || null,
    stockNumber: input.stockNumber?.trim() || null,
    summary: input.summary?.trim() || null,
    description: input.description?.trim() || null,
    externalUrl: input.externalUrl?.trim() || null,
    listingStatus: input.listingStatus ?? "draft",
    priceDisplayMode: input.priceDisplayMode ?? "exact",
    featured: Boolean(input.featured),
    sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    specifications: (input.specifications ?? [])
      .map((row) => ({
        label: String(row.label ?? "").trim(),
        value: String(row.value ?? "").trim(),
      }))
      .filter((row) => row.label && row.value),
    highlights: (input.highlights ?? [])
      .map((text) => String(text ?? "").trim())
      .filter(Boolean),
    galleryImageIds: (input.galleryImageIds ?? []).filter((id) =>
      Number.isFinite(id),
    ),
  };
}
