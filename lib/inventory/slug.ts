export function normalizeInventorySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function suggestInventorySlug(input: {
  year?: number | null;
  make?: string;
  model?: string;
  trim?: string | null;
  title?: string;
}): string {
  const parts = [
    input.year ? String(input.year) : "",
    input.make ?? "",
    input.model ?? "",
    input.trim ?? "",
  ]
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length) return normalizeInventorySlug(parts.join(" "));
  return normalizeInventorySlug(input.title ?? "vehicle");
}
