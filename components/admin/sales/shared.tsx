// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SalesUiDoc = Record<string, any>;

export function fmtMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function resolveName(rel: SalesUiDoc | number | null | undefined, fallback = "—"): string {
  if (!rel) return fallback;
  if (typeof rel === "object") {
    return (
      (rel.companyName as string) ||
      (rel.name as string) ||
      (rel.title as string) ||
      fallback
    );
  }
  return `#${rel}`;
}
