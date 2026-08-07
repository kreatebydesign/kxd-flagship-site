/**
 * Client Site Intelligence — Shared Core contracts (csi-v1-a).
 * Facts only. Not CRM. Not Product Intelligence meaning.
 */

export const CLIENT_SITE_EVENT_CLASSES = [
  "website_lead",
  "qualified_conversion",
  "confirmed_sale",
  "deployment",
  "seo_milestone",
  "indexing_milestone",
  "analytics_milestone",
  "form_config_change",
  "maintenance",
  "operator_work",
] as const;

export type ClientSiteEventClass = (typeof CLIENT_SITE_EVENT_CLASSES)[number];

export const CLIENT_SITE_SENSITIVITY = [
  "internal",
  "sensitive_contact",
  "client_safe",
] as const;

export type ClientSiteSensitivity = (typeof CLIENT_SITE_SENSITIVITY)[number];

export const CLIENT_SITE_VISIBILITY = ["internal_only", "client_visible"] as const;

export type ClientSiteVisibility = (typeof CLIENT_SITE_VISIBILITY)[number];

export const CLIENT_SITE_PROCESSING_STATUS = [
  "received",
  "persisted",
  "activity_published",
  "failed",
] as const;

export type ClientSiteProcessingStatus =
  (typeof CLIENT_SITE_PROCESSING_STATUS)[number];

/** Canonical website-lead lifecycle on ingest — authority fields are forced. */
export const WEBSITE_LEAD_INGEST_LIFECYCLE_STATUS = "new" as const;
export const WEBSITE_LEAD_INGEST_COMMISSION_STATUS = "not_due" as const;

export interface WebsiteLeadUtmPayload {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
}

export interface WebsiteLeadCustomerPayload {
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
}

/**
 * Normalized website_lead payload stored in Shared Core.
 * Commission/sale authority fields are always ingest-forced — never website-declared.
 */
export interface WebsiteLeadNormalizedPayload {
  leadId: string;
  formSource: string | null;
  formPath: string | null;
  customer: WebsiteLeadCustomerPayload;
  modelInterest: string | null;
  productInterest: string | null;
  utm: WebsiteLeadUtmPayload;
  referrer: string | null;
  landingPage: string | null;
  lifecycleStatus: typeof WEBSITE_LEAD_INGEST_LIFECYCLE_STATUS;
  commissionAmountCents: number;
  commissionStatus: typeof WEBSITE_LEAD_INGEST_COMMISSION_STATUS;
  soldAt: null;
  saleReference: null;
}

export interface ClientSiteEventRecord {
  id: number;
  clientId: number;
  clientKey: string;
  eventClass: ClientSiteEventClass;
  externalEventId: string;
  sourceSystem: string;
  occurredAt: string;
  receivedAt: string;
  sensitivity: ClientSiteSensitivity;
  visibilityState: ClientSiteVisibility;
  processingStatus: ClientSiteProcessingStatus;
  payload: WebsiteLeadNormalizedPayload | Record<string, unknown>;
  ingestMeta: Record<string, unknown>;
  activityTimelineEventId: number | null;
  idempotencyKey: string;
}

export interface PersistClientSiteEventInput {
  clientId: number;
  clientKey: string;
  eventClass: ClientSiteEventClass;
  externalEventId: string;
  sourceSystem: string;
  occurredAt: string;
  receivedAt: string;
  sensitivity: ClientSiteSensitivity;
  visibilityState: ClientSiteVisibility;
  payload: WebsiteLeadNormalizedPayload | Record<string, unknown>;
  ingestMeta: Record<string, unknown>;
  idempotencyKey: string;
}

export type PersistClientSiteEventResult =
  | { kind: "created"; record: ClientSiteEventRecord }
  | { kind: "duplicate"; record: ClientSiteEventRecord };

export interface ClientSiteIngestHttpBody {
  ok: boolean;
  duplicate?: boolean;
  eventId?: number;
  externalEventId?: string;
  eventClass?: string;
  activityPublished?: boolean;
  error?: string;
  code?: string;
}

export interface ClientSiteIngestHttpResult {
  status: number;
  body: ClientSiteIngestHttpBody;
}
