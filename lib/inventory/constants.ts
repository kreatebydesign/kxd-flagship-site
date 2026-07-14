export const INVENTORY_COLLECTION = "client-inventory-vehicles" as const;

export const INVENTORY_MODULE_ID = "inventory" as const;

export const LISTING_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  available: "Available",
  pending: "Pending",
  sold: "Sold",
  hidden: "Hidden",
  coming_soon: "Coming soon",
};

export const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  used: "Used",
};

export const PRICE_MODE_LABELS: Record<string, string> = {
  exact: "Exact price",
  contact: "Contact for price",
  call: "Call for price",
  hidden: "Price hidden",
};
