/** Split prose/bulleted services into checklist items for operator presentation. */
export function splitChecklistItems(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/[•·]/g, "\n")
    .replace(/;\s+/g, "\n");
  const lines = normalized
    .split(/\n|(?<=\.)\s+(?=[A-Z])/)
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line.length > 1);

  if (lines.length > 1) return lines;

  // Single paragraph with commas / "and"
  const parts = raw
    .split(/,(?:\s+and\s+|\s+)/i)
    .map((p) => p.replace(/\band\b/gi, "").trim())
    .filter((p) => p.length > 2);
  return parts.length > 1 ? parts : [raw.trim()];
}

export { formatPaymentStatusLabel } from "@/lib/client-command/commercial/payment-status-display";
