/**
 * Client-safe portal commercial view models.
 * No Stripe IDs, webhook metadata, signing tokens, or operator fields.
 */

export type PortalCommercialDocument = {
  id: number;
  title: string;
  kindLabel: string;
  downloadHref: string;
};

export type PortalCommercialObligationRow = {
  id: string;
  label: string;
  amountLabel: string;
  statusLabel: string;
  dueDateLabel: string | null;
  /** Client-safe receipt link (Stripe-hosted URL only — never exposed as an ID). */
  receiptHref: string | null;
};

export type PortalCommercialCollaboration = {
  label: string;
  href: string;
  detail: string;
};

export type PortalCommercialReady = {
  kind: "ready";
  engagement: {
    title: string;
    statusLabel: string;
    totalLabel: string | null;
  };
  agreement: {
    title: string;
    statusLabel: string;
    executedDateLabel: string | null;
    clientSignerName: string | null;
    kxdSignerName: string | null;
  };
  scope: {
    proposalReference: string | null;
    summary: string | null;
    deliverables: string[];
    proposalDocument: PortalCommercialDocument | null;
  };
  payments: {
    totalLabel: string;
    paidLabel: string;
    remainingLabel: string;
    schedule: PortalCommercialObligationRow[];
  };
  documents: PortalCommercialDocument[];
  collaboration: PortalCommercialCollaboration | null;
};

export type PortalCommercialView =
  | PortalCommercialReady
  | {
      kind: "unavailable";
      title: string;
      description: string;
    };
