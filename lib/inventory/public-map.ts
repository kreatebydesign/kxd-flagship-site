import type {
  InventoryCondition,
  InventoryGroup,
  InventoryListingStatus,
  InventoryVehicleRecord,
  PublicInventoryVehicle,
  PublicListableStatus,
} from "./types";
import { PUBLIC_LISTABLE_STATUSES } from "./types";
import { mapPublicImage, toAbsoluteMediaUrl } from "./media";

export function deriveInventoryGroup(input: {
  listingStatus: InventoryListingStatus;
  condition: InventoryCondition;
}): InventoryGroup {
  if (input.listingStatus === "coming_soon") return "coming_soon";
  if (input.condition === "new") return "new";
  return "used";
}

export function isPublicListableStatus(
  status: InventoryListingStatus,
): status is PublicListableStatus {
  return (PUBLIC_LISTABLE_STATUSES as readonly string[]).includes(status);
}

export function toPublicInventoryVehicle(
  record: InventoryVehicleRecord,
): PublicInventoryVehicle | null {
  if (!isPublicListableStatus(record.listingStatus)) return null;

  return {
    id: String(record.id),
    slug: record.slug,
    title: record.title,
    year: record.year,
    make: record.make,
    model: record.model,
    trim: record.trim,
    condition: record.condition,
    inventoryGroup: deriveInventoryGroup({
      listingStatus: record.listingStatus,
      condition: record.condition,
    }),
    listingStatus: record.listingStatus,
    featured: record.featured,
    price: record.price,
    priceDisplayMode: record.priceDisplayMode,
    mileage: record.mileage,
    stockNumber: record.stockNumber,
    summary: record.summary,
    description: record.description,
    specifications: record.specifications.map((row) => ({
      label: row.label,
      value: row.value,
    })),
    highlights: record.highlights.map((row) => row.text).filter(Boolean),
    primaryImage: record.primaryImage
      ? {
          url: toAbsoluteMediaUrl(record.primaryImage.url),
          alt: record.primaryImage.alt,
        }
      : null,
    gallery: record.gallery.map((image) => ({
      url: toAbsoluteMediaUrl(image.url),
      alt: image.alt,
    })),
    sortOrder: record.sortOrder,
    publishedAt: record.publishedAt,
    externalUrl: record.externalUrl,
  };
}

/** Escape hatch when mapping raw docs without a full record parse. */
export function mapPublicImageField(value: unknown) {
  return mapPublicImage(value, "card");
}
