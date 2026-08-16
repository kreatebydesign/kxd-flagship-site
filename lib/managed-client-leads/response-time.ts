/**
 * Response-time derivation for managed-client inquiries.
 */

export function calculateResponseTimeSeconds(
  receivedAt: string | Date | null | undefined,
  firstRespondedAt: string | Date | null | undefined,
): number | null {
  if (!receivedAt || !firstRespondedAt) return null;
  const start = new Date(receivedAt).getTime();
  const end = new Date(firstRespondedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 1000);
}

export function formatResponseTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 48) return rem ? `${hours}h ${rem}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
