import {
  formatPriceDollarsForInput,
  parseOptionalPriceDollars,
} from "./pricing";
import type { CalendarEventRecord, CalendarEventType } from "./types";

export type CalendarEditorFormState = {
  titleOverride: string;
  sourceTitle: string;
  startsOn: string;
  endsOn: string;
  eventType: CalendarEventType;
  status: CalendarEventRecord["status"];
  listedOnWebsite: boolean;
  featured: boolean;
  venueName: string;
  venueCity: string;
  venueState: string;
  venueAddress: string;
  summary: string;
  description: string;
  practiceNotes: string;
  registrationGuidance: string;
  registrationPrice: string;
  supportPrice: string;
  transportationPrice: string;
  newTiresPrice: string;
  otherServiceName: string;
  otherServicePrice: string;
  timezone: string;
};

export function formStateFromRecord(record?: CalendarEventRecord | null): CalendarEditorFormState {
  return {
    titleOverride: record?.titleOverride ?? "",
    sourceTitle: record?.sourceTitle ?? "",
    startsOn: record?.startsOn ?? "",
    endsOn: record?.endsOn ?? "",
    eventType: record?.eventType ?? "school",
    status: record?.status ?? "draft",
    listedOnWebsite: record?.listedOnWebsite ?? false,
    featured: record?.featured ?? false,
    venueName: record?.venueName ?? "",
    venueCity: record?.venueCity ?? "",
    venueState: record?.venueState ?? "",
    venueAddress: record?.venueAddress ?? "",
    summary: record?.summary ?? "",
    description: record?.description ?? "",
    practiceNotes: record?.practiceNotes ?? "",
    registrationGuidance: record?.registrationGuidance ?? "",
    registrationPrice: formatPriceDollarsForInput(record?.registrationPriceCents),
    supportPrice: formatPriceDollarsForInput(record?.supportPriceCents),
    transportationPrice: formatPriceDollarsForInput(record?.transportationPriceCents),
    newTiresPrice: formatPriceDollarsForInput(record?.newTiresPriceCents),
    otherServiceName: record?.otherServiceName ?? "",
    otherServicePrice: formatPriceDollarsForInput(record?.otherServicePriceCents),
    timezone: record?.timezone ?? "America/New_York",
  };
}

/** Blank slate for consecutive manual entry; keeps non-event-specific defaults only. */
export function formStateForNextEvent(
  previous: CalendarEditorFormState,
): CalendarEditorFormState {
  return {
    titleOverride: "",
    sourceTitle: "",
    startsOn: "",
    endsOn: "",
    eventType: previous.eventType,
    status: "draft",
    listedOnWebsite: false,
    featured: false,
    venueName: "",
    venueCity: "",
    venueState: "",
    venueAddress: "",
    summary: "",
    description: "",
    practiceNotes: "",
    registrationGuidance: "",
    registrationPrice: "",
    supportPrice: "",
    transportationPrice: "",
    newTiresPrice: "",
    otherServiceName: "",
    otherServicePrice: "",
    timezone: previous.timezone,
  };
}

export function calendarPricingFromFormState(form: CalendarEditorFormState) {
  return {
    registrationPriceCents: parseOptionalPriceDollars(form.registrationPrice),
    supportPriceCents: parseOptionalPriceDollars(form.supportPrice),
    transportationPriceCents: parseOptionalPriceDollars(form.transportationPrice),
    newTiresPriceCents: parseOptionalPriceDollars(form.newTiresPrice),
    otherServiceName: form.otherServiceName.trim() || null,
    otherServicePriceCents: parseOptionalPriceDollars(form.otherServicePrice),
  };
}