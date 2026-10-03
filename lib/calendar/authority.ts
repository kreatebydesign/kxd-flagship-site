import type {
  CalendarEventRecord,
  CalendarFieldAuthority,
  CalendarSourceSystem,
  PrimalOwnedField,
  SourceOwnedField,
} from "./types";
import { PRIMAL_OWNED_FIELDS, SOURCE_OWNED_FIELDS } from "./types";

export function defaultFieldAuthority(
  sourceSystem: CalendarSourceSystem,
): CalendarFieldAuthority {
  const authority: CalendarFieldAuthority = {};
  for (const field of PRIMAL_OWNED_FIELDS) authority[field] = "primal";
  if (sourceSystem === "manual") {
    for (const field of SOURCE_OWNED_FIELDS) authority[field] = "primal";
    return authority;
  }
  for (const field of SOURCE_OWNED_FIELDS) authority[field] = "source";
  return authority;
}

export function isSourceOwned(
  authority: CalendarFieldAuthority,
  field: SourceOwnedField | PrimalOwnedField,
): boolean {
  return (authority[field] ?? "primal") === "source";
}

export function displayTitle(event: {
  titleOverride: string | null;
  sourceTitle: string;
}): string {
  const override = event.titleOverride?.trim();
  return override || event.sourceTitle;
}

/** Apply official-source fields without overwriting Primal-owned editorial. */
export function applySourceOwnedFields<T extends Partial<CalendarEventRecord>>(
  existing: CalendarEventRecord,
  incoming: T,
): Partial<CalendarEventRecord> {
  const patch: Partial<CalendarEventRecord> = {};
  const authority = existing.fieldAuthority ?? defaultFieldAuthority(existing.sourceSystem);

  const maybe = <K extends SourceOwnedField>(key: K) => {
    if (!isSourceOwned(authority, key)) return;
    if (incoming[key] === undefined) return;
    patch[key] = incoming[key] as CalendarEventRecord[K];
  };

  maybe("sourceTitle");
  maybe("startsOn");
  maybe("endsOn");
  maybe("timezone");
  maybe("allDay");
  maybe("venueName");
  maybe("venueCity");
  maybe("venueState");
  maybe("venueAddress");
  maybe("status");
  maybe("sourceUrl");
  maybe("sourceEventType");

  return patch;
}

export function sourceOwnedLockedMessage(fieldLabel: string): string {
  return `${fieldLabel} is maintained from the official schedule. Primal can add notes and website context without overwriting the official date or venue.`;
}
