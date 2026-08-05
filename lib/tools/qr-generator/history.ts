/**
 * Browser-only recent history for the QR Generator.
 * Never persisted to the server.
 */

export type QrHistoryEntry = {
  url: string;
  createdAt: string;
};

export const QR_HISTORY_STORAGE_KEY = "kxd-os.tools.qr-generator.history.v1";
export const QR_HISTORY_LIMIT = 8;

const listeners = new Set<() => void>();

function emitHistoryChange() {
  for (const listener of listeners) listener();
}

export function subscribeQrHistory(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

export function getQrHistorySnapshot(): string {
  if (typeof window === "undefined") return "[]";
  try {
    return window.localStorage.getItem(QR_HISTORY_STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function getQrHistoryServerSnapshot(): string {
  return "[]";
}

export function parseQrHistorySnapshot(raw: string): QrHistoryEntry[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is QrHistoryEntry =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as QrHistoryEntry).url === "string" &&
          typeof (item as QrHistoryEntry).createdAt === "string",
      )
      .slice(0, QR_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function readQrHistory(): QrHistoryEntry[] {
  return parseQrHistorySnapshot(getQrHistorySnapshot());
}

export function pushQrHistory(
  url: string,
  now: Date = new Date(),
): QrHistoryEntry[] {
  const next: QrHistoryEntry[] = [
    { url, createdAt: now.toISOString() },
    ...readQrHistory().filter((entry) => entry.url !== url),
  ].slice(0, QR_HISTORY_LIMIT);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(QR_HISTORY_STORAGE_KEY, JSON.stringify(next));
    emitHistoryChange();
  }
  return next;
}

export function clearQrHistory(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(QR_HISTORY_STORAGE_KEY);
  emitHistoryChange();
}
