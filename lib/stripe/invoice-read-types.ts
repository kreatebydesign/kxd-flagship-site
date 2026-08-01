/**
 * Phase 5 Batch 5B — Client-safe Stripe invoice read types.
 * Pure module — no network, no secrets.
 */

/** Provider invoice statuses Stripe invoices commonly return. */
export type StripeInvoiceProviderStatus =
  | "draft"
  | "open"
  | "paid"
  | "uncollectible"
  | "void"
  | "unknown";

/** Allowlisted portal-safe invoice projection (no customer IDs, metadata, or PI). */
export type PortalSafeStripeInvoice = {
  id: string;
  number: string | null;
  status: StripeInvoiceProviderStatus;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  createdAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
  hostedInvoiceUrl: string | null;
  /** Same hosted invoice URL doubles as Stripe-hosted payment surface when open. */
  hostedPaymentUrl: string | null;
  /** Receipt URLs are not present on Invoice objects — always null in Batch 5B. */
  hostedReceiptUrl: null;
};

export type InvoiceReadAvailability =
  | "ready"
  | "empty"
  | "unavailable";

export type InvoiceReadUnavailableCode =
  | "read_not_authorized"
  | "session_required"
  | "client_mismatch"
  | "browser_authority_rejected"
  | "missing_configuration"
  | "mode_disallowed"
  | "mode_mismatch"
  | "missing_billing_profile"
  | "missing_customer_mapping"
  | "invalid_customer_mapping"
  | "mapping_not_linked"
  | "provider_permission_denied"
  | "provider_auth_failed"
  | "provider_timeout"
  | "provider_outage"
  | "provider_malformed"
  | "invoice_not_found"
  | "cross_customer_denied"
  | "invalid_invoice_id"
  | "unexpected_failure";

export type InvoiceReadListResult =
  | {
      availability: "ready" | "empty";
      code: null;
      message: null;
      clientId: number;
      mode: "test";
      invoices: PortalSafeStripeInvoice[];
      /** True when the provider page indicates more results beyond this bound. */
      hasMore: boolean;
      limit: number;
    }
  | {
      availability: "unavailable";
      code: InvoiceReadUnavailableCode;
      message: string;
      clientId: number | null;
      mode: "test" | null;
      invoices: [];
      hasMore: false;
      limit: number;
    };

export type InvoiceReadOneResult =
  | {
      availability: "ready";
      code: null;
      message: null;
      clientId: number;
      mode: "test";
      invoice: PortalSafeStripeInvoice;
    }
  | {
      availability: "unavailable";
      code: InvoiceReadUnavailableCode;
      message: string;
      clientId: number | null;
      mode: "test" | null;
      invoice: null;
    };

/** Internal provider snapshot used before allowlisted projection. */
export type StripeInvoiceReadSnapshot = {
  id: string;
  customerId: string;
  number: string | null;
  status: string;
  livemode: boolean;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  created: number | null;
  dueDate: number | null;
  paidAt: number | null;
  hostedInvoiceUrl: string | null;
};

export type BillingProfileInvoiceMapping = {
  clientId: number;
  stripeCustomerId: string | null;
  stripeMode: "test" | "live" | null;
  stripeCustomerMappingStatus: string | null;
};

export const INVOICE_READ_DTO_ALLOWLIST = [
  "id",
  "number",
  "status",
  "amountDue",
  "amountPaid",
  "amountRemaining",
  "currency",
  "createdAt",
  "dueDate",
  "paidAt",
  "hostedInvoiceUrl",
  "hostedPaymentUrl",
  "hostedReceiptUrl",
] as const;

export const INVOICE_READ_EXCLUDED_PROVIDER_FIELDS = [
  "customer",
  "customer_email",
  "customer_address",
  "customer_name",
  "customer_phone",
  "customer_shipping",
  "customer_tax_ids",
  "payment_intent",
  "default_payment_method",
  "charge",
  "charges",
  "metadata",
  "subscription",
  "subscription_details",
  "account_name",
  "account_tax_ids",
  "application",
  "application_fee_amount",
  "transfer_data",
  "webhooks_delivered_at",
  "lines",
  "custom_fields",
  "footer",
  "description",
  "statement_descriptor",
  "invoice_pdf",
] as const;
