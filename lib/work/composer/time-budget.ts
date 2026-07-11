/**
 * Time Budget — composer-facing duration presets.
 * Persists as hours on `estimatedEffort` (Work collection).
 *
 * Future extension points (do not replace this UI):
 * - AI suggested durations → set preset / hours via openWorkComposer
 * - Historical learning → prefer presets that match past completions
 * - Actual vs estimated → compare logged time to hoursFromPreset
 * - Calendar scheduling → schedule blocks using resolved hours
 */

export const TIME_BUDGET_CUSTOM_ID = "custom" as const;

export type TimeBudgetPreset = {
  id: string;
  label: string;
  /** Hours stored on Work.estimatedEffort — null for Custom / empty. */
  hours: number | null;
};

export const TIME_BUDGET_PRESETS: TimeBudgetPreset[] = [
  { id: "", label: "—", hours: null },
  { id: "5m", label: "5 minutes", hours: 5 / 60 },
  { id: "15m", label: "15 minutes", hours: 15 / 60 },
  { id: "30m", label: "30 minutes", hours: 0.5 },
  { id: "45m", label: "45 minutes", hours: 0.75 },
  { id: "1h", label: "1 hour", hours: 1 },
  { id: "2h", label: "2 hours", hours: 2 },
  { id: "half-day", label: "Half day", hours: 4 },
  { id: "full-day", label: "Full day", hours: 8 },
  { id: TIME_BUDGET_CUSTOM_ID, label: "Custom…", hours: null },
];

export function isTimeBudgetCustom(presetId: string): boolean {
  return presetId === TIME_BUDGET_CUSTOM_ID;
}

export function hoursFromTimeBudgetPreset(presetId: string): number | null {
  const preset = TIME_BUDGET_PRESETS.find((p) => p.id === presetId);
  return preset?.hours ?? null;
}

/** Map a stored hour value back to a preset id when it matches a known option. */
export function timeBudgetPresetFromHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return "";
  const match = TIME_BUDGET_PRESETS.find(
    (p) => p.hours != null && Math.abs(p.hours - hours) < 0.001,
  );
  if (match) return match.id;
  return TIME_BUDGET_CUSTOM_ID;
}

/** Normalize custom hours + minutes into durable fractional hours. */
export function hoursFromCustomParts(
  hoursRaw: string | number,
  minutesRaw: string | number,
): number | null {
  const h = typeof hoursRaw === "number" ? hoursRaw : Number.parseInt(String(hoursRaw), 10);
  const m =
    typeof minutesRaw === "number" ? minutesRaw : Number.parseInt(String(minutesRaw), 10);
  const hours = Number.isFinite(h) && h > 0 ? h : 0;
  const minutes = Number.isFinite(m) && m > 0 ? Math.min(59, m) : 0;
  if (hours === 0 && minutes === 0) return null;
  return Math.round((hours + minutes / 60) * 100) / 100;
}

export function customPartsFromHours(totalHours: number | null | undefined): {
  hours: string;
  minutes: string;
} {
  if (totalHours == null || !Number.isFinite(totalHours) || totalHours <= 0) {
    return { hours: "", minutes: "" };
  }
  const whole = Math.floor(totalHours);
  const minutes = Math.round((totalHours - whole) * 60);
  return {
    hours: whole > 0 ? String(whole) : "",
    minutes: minutes > 0 ? String(minutes) : "",
  };
}

/** Resolve estimatedEffort from draft time-budget fields. */
export function resolveTimeBudgetHours(input: {
  timeBudgetPresetId: string;
  customHours: string;
  customMinutes: string;
  estimatedEffort?: number | null;
}): number | null {
  if (isTimeBudgetCustom(input.timeBudgetPresetId)) {
    return hoursFromCustomParts(input.customHours, input.customMinutes);
  }
  const fromPreset = hoursFromTimeBudgetPreset(input.timeBudgetPresetId);
  if (fromPreset != null) return fromPreset;
  return input.estimatedEffort ?? null;
}

export function formatTimeBudgetHours(hours: number | null | undefined): string | null {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return null;
  const preset = TIME_BUDGET_PRESETS.find(
    (p) => p.hours != null && Math.abs(p.hours - hours) < 0.001,
  );
  if (preset?.label && preset.id) return preset.label;
  const parts = customPartsFromHours(hours);
  const bits: string[] = [];
  if (parts.hours) bits.push(`${parts.hours}h`);
  if (parts.minutes) bits.push(`${parts.minutes}m`);
  return bits.join(" ") || null;
}
