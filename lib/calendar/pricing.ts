import type { CalendarEventRecord, PublicCalendarEventPricing } from "./types";

export const MAX_CALENDAR_PRICE_CENTS = 50_000_000;

export function parseOptionalPriceDollars(input: string): number | null {
  const trimmed = input.trim().replace(/[$,\s]/g, "");
  if (!trimmed) return null;
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  const cents = Math.round(value * 100);
  if (cents > MAX_CALENDAR_PRICE_CENTS) return null;
  return cents;
}

export function formatPriceDollarsForInput(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "";
  return (cents / 100).toFixed(2);
}

function asOptionalCents(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_CALENDAR_PRICE_CENTS) return null;
  return Math.round(n);
}

export type CalendarPricingInput = {
  registrationPriceCents?: number | null;
  supportPriceCents?: number | null;
  transportationPriceCents?: number | null;
  newTiresPriceCents?: number | null;
  otherServiceName?: string | null;
  otherServicePriceCents?: number | null;
};

export function normalizeCalendarPricing(input: CalendarPricingInput): CalendarPricingInput {
  return {
    registrationPriceCents: asOptionalCents(input.registrationPriceCents),
    supportPriceCents: asOptionalCents(input.supportPriceCents),
    transportationPriceCents: asOptionalCents(input.transportationPriceCents),
    newTiresPriceCents: asOptionalCents(input.newTiresPriceCents),
    otherServiceName:
      typeof input.otherServiceName === "string" && input.otherServiceName.trim()
        ? input.otherServiceName.trim()
        : null,
    otherServicePriceCents: asOptionalCents(input.otherServicePriceCents),
  };
}

export function validateCalendarPricing(input: CalendarPricingInput): { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = [];
  const name = input.otherServiceName?.trim() ?? "";
  const otherCents = input.otherServicePriceCents;
  if (otherCents != null && otherCents > 0 && !name) {
    issues.push({ field: "otherServiceName", message: "Enter a name for the other service." });
  }
  if (name.length > 80) {
    issues.push({ field: "otherServiceName", message: "Other service name is too long." });
  }
  return issues;
}

export function publicPricingFromRecord(event: CalendarEventRecord): PublicCalendarEventPricing {
  return {
    registrationPriceCents: event.registrationPriceCents,
    supportPriceCents: event.supportPriceCents,
    transportationPriceCents: event.transportationPriceCents,
    newTiresPriceCents: event.newTiresPriceCents,
    otherServiceName: event.otherServiceName,
    otherServicePriceCents: event.otherServicePriceCents,
  };
}

/** Native/manual rows may use portal price at checkout; MSR checkout stays on MotorsportReg. */
export function registrationPriceIsAuthoritative(event: CalendarEventRecord): boolean {
  return event.sourceSystem === "manual" || event.sourceSystem === "external";
}