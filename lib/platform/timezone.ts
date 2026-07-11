/**
 * Display timezone for KXD OS executive surfaces.
 * Prefer the user's timezone when available; otherwise business default.
 */

export const KXD_BUSINESS_TIMEZONE =
  process.env.KXD_BUSINESS_TIMEZONE?.trim() || "America/Los_Angeles";

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveDisplayTimezone(userTimezone?: string | null): string {
  const candidate = userTimezone?.trim();
  if (candidate && isValidTimeZone(candidate)) return candidate;
  return KXD_BUSINESS_TIMEZONE;
}

/**
 * Resolve timezone for the current request.
 * Order: kxd_timezone cookie → Vercel IP timezone → business default.
 */
export async function resolveRequestTimezone(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const cookieHeader = h.get("cookie") ?? "";
    const cookieMatch = cookieHeader.match(/(?:^|;\s*)kxd_timezone=([^;]+)/);
    const cookieTz = cookieMatch?.[1]
      ? decodeURIComponent(cookieMatch[1].trim())
      : null;
    const vercelTz = h.get("x-vercel-ip-timezone")?.trim() || null;
    return resolveDisplayTimezone(cookieTz || vercelTz);
  } catch {
    return KXD_BUSINESS_TIMEZONE;
  }
}

export function getZonedHour(date: Date, timeZone: string = KXD_BUSINESS_TIMEZONE): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value;

  const hour = Number(hourPart ?? "0");
  return hour === 24 ? 0 : hour;
}

export function formatDisplayDate(
  date: Date = new Date(),
  timeZone: string = KXD_BUSINESS_TIMEZONE,
): string {
  return date.toLocaleDateString("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDisplayTime(
  date: Date = new Date(),
  timeZone: string = KXD_BUSINESS_TIMEZONE,
): string {
  return date.toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDisplayDateShort(
  date: Date,
  timeZone: string = KXD_BUSINESS_TIMEZONE,
): string {
  return date.toLocaleDateString("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  });
}
