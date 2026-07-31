/**
 * Phase 37I/37J/Lifecycle — Injectable Stripe commercial adapter.
 * Reads: account + customers. Writes: customers.create (37J) + test invoices (lifecycle).
 * Fake adapter used by deterministic verification (no network).
 */

import type Stripe from "stripe";
import { KXD_STRIPE_CLIENT_METADATA_KEY } from "./customer-linking-types";

export type CommercialStripeAccountSnapshot = {
  accountId: string;
  livemode: boolean;
};

export type CommercialStripeCustomerSnapshot = {
  id: string;
  name: string | null;
  email: string | null;
  deleted: boolean;
  livemode: boolean;
  created: number | null;
  metadata: Record<string, string>;
};

export type CommercialStripeCreateCustomerParams = {
  name: string;
  email: string;
  metadata: Record<string, string>;
  /** Opaque server-derived key — never log or return to browser. */
  idempotencyKey: string;
};

export type CommercialStripeInvoiceSnapshot = {
  id: string;
  customerId: string;
  status: string;
  livemode: boolean;
  amountDue: number;
  amountPaid: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  paymentIntentId: string | null;
  metadata: Record<string, string>;
};

export type CommercialStripeCreateInvoiceParams = {
  customerId: string;
  currency: string;
  description: string;
  metadata: Record<string, string>;
  amountCents: number;
  idempotencyKey: string;
  automaticTaxEnabled?: false;
};

export type CommercialStripeAdapter = {
  verifyAccount(): Promise<CommercialStripeAccountSnapshot>;
  retrieveCustomer(
    customerId: string,
  ): Promise<CommercialStripeCustomerSnapshot | null>;
  listCustomersByEmail(
    email: string,
    limit: number,
  ): Promise<CommercialStripeCustomerSnapshot[]>;
  listCustomersByName(
    name: string,
    limit: number,
  ): Promise<CommercialStripeCustomerSnapshot[]>;
  searchCustomersByClientMetadata(
    clientId: number,
    limit: number,
  ): Promise<CommercialStripeCustomerSnapshot[]>;
  createCustomer(
    params: CommercialStripeCreateCustomerParams,
  ): Promise<CommercialStripeCustomerSnapshot>;
  createAndFinalizeInvoice(
    params: CommercialStripeCreateInvoiceParams,
  ): Promise<CommercialStripeInvoiceSnapshot>;
  retrieveInvoice(invoiceId: string): Promise<CommercialStripeInvoiceSnapshot | null>;
};

function asMetadata(meta: Stripe.Metadata | null | undefined): Record<string, string> {
  if (!meta || typeof meta !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/**
 * Fail closed for commercial TEST MODE gates.
 * Only an explicit `livemode: false` is treated as test; missing/undefined is unsafe (live).
 */
export function normalizeStripeLivemodeFlag(
  livemode: boolean | undefined | null,
): boolean {
  return livemode !== false;
}

function mapCustomer(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
  livemodeFallback: boolean | undefined,
): CommercialStripeCustomerSnapshot {
  if ("deleted" in customer && customer.deleted) {
    return {
      id: customer.id,
      name: null,
      email: null,
      deleted: true,
      livemode: normalizeStripeLivemodeFlag(
        (customer as { livemode?: boolean }).livemode ?? livemodeFallback,
      ),
      created: null,
      metadata: {},
    };
  }
  const live = customer as Stripe.Customer;
  return {
    id: live.id,
    name: live.name ?? null,
    email: live.email ?? null,
    deleted: false,
    livemode: normalizeStripeLivemodeFlag(
      (live as { livemode?: boolean }).livemode ?? livemodeFallback,
    ),
    created: typeof live.created === "number" ? live.created : null,
    metadata: asMetadata(live.metadata),
  };
}

function mapInvoice(
  invoice: Stripe.Invoice,
  livemodeFallback: boolean | undefined,
): CommercialStripeInvoiceSnapshot {
  const pi = invoice.payment_intent;
  const paymentIntentId =
    typeof pi === "string" ? pi : pi && typeof pi === "object" ? pi.id : null;
  return {
    id: invoice.id,
    customerId:
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id ?? "",
    status: String(invoice.status ?? "unknown"),
    livemode: normalizeStripeLivemodeFlag(
      (invoice.livemode as boolean | undefined) ?? livemodeFallback,
    ),
    amountDue: invoice.amount_due ?? 0,
    amountPaid: invoice.amount_paid ?? 0,
    currency: String(invoice.currency ?? "usd").toUpperCase(),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    paymentIntentId,
    metadata: asMetadata(invoice.metadata),
  };
}

export function createLiveCommercialStripeAdapter(
  stripe: Stripe,
): CommercialStripeAdapter {
  return {
    async verifyAccount() {
      const account = await stripe.accounts.retrieve();
      // Account self-retrieve often omits `livemode`. Balance always includes it.
      const balance = await stripe.balance.retrieve();
      const accountFlag = (account as { livemode?: boolean }).livemode;
      if (accountFlag === true || balance.livemode !== false) {
        return { accountId: account.id, livemode: true };
      }
      return { accountId: account.id, livemode: false };
    },
    async retrieveCustomer(customerId: string) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        return mapCustomer(customer, undefined);
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: string }).code)
            : "";
        if (code === "resource_missing") return null;
        throw err;
      }
    },
    async listCustomersByEmail(email: string, limit: number) {
      const list = await stripe.customers.list({
        email: email.trim(),
        limit: Math.min(Math.max(limit, 1), 10),
      });
      const listFlag = (list as { livemode?: boolean }).livemode;
      return list.data.map((row) => mapCustomer(row, listFlag));
    },
    async listCustomersByName(name: string, limit: number) {
      try {
        const escaped = name.replace(/'/g, "\\'");
        const result = await stripe.customers.search({
          query: `name~'${escaped}'`,
          limit: Math.min(Math.max(limit, 1), 10),
        });
        const listFlag = (result as { livemode?: boolean }).livemode;
        return result.data.map((row) => mapCustomer(row, listFlag));
      } catch {
        return [];
      }
    },
    async searchCustomersByClientMetadata(clientId: number, limit: number) {
      try {
        const result = await stripe.customers.search({
          query: `metadata['${KXD_STRIPE_CLIENT_METADATA_KEY}']:'${clientId}'`,
          limit: Math.min(Math.max(limit, 1), 10),
        });
        const listFlag = (result as { livemode?: boolean }).livemode;
        return result.data.map((row) => mapCustomer(row, listFlag));
      } catch {
        return [];
      }
    },
    async createCustomer(params) {
      const customer = await stripe.customers.create(
        {
          name: params.name,
          email: params.email,
          metadata: params.metadata,
        },
        { idempotencyKey: params.idempotencyKey },
      );
      return mapCustomer(customer, undefined);
    },
    async createAndFinalizeInvoice(params) {
      if (params.amountCents <= 0) {
        throw new Error("Invoice amount must be positive.");
      }
      const invoice = await stripe.invoices.create(
        {
          customer: params.customerId,
          currency: params.currency.toLowerCase(),
          collection_method: "send_invoice",
          days_until_due: 7,
          auto_advance: false,
          automatic_tax: { enabled: false },
          description: params.description,
          metadata: params.metadata,
        },
        { idempotencyKey: `${params.idempotencyKey}:invoice` },
      );
      await stripe.invoiceItems.create(
        {
          customer: params.customerId,
          invoice: invoice.id,
          amount: params.amountCents,
          currency: params.currency.toLowerCase(),
          description: params.description,
          metadata: params.metadata,
        },
        { idempotencyKey: `${params.idempotencyKey}:item` },
      );
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id, {
        expand: ["payment_intent"],
      });
      return mapInvoice(finalized, undefined);
    },
    async retrieveInvoice(invoiceId: string) {
      try {
        const invoice = await stripe.invoices.retrieve(invoiceId, {
          expand: ["payment_intent"],
        });
        return mapInvoice(invoice, undefined);
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: string }).code)
            : "";
        if (code === "resource_missing") return null;
        throw err;
      }
    },
  };
}

export function createFakeCommercialStripeAdapter(options?: {
  accountId?: string;
  livemode?: boolean;
  customers?: CommercialStripeCustomerSnapshot[];
  invoices?: CommercialStripeInvoiceSnapshot[];
  failVerify?: boolean;
  createBehavior?: "succeed" | "fail_network";
  idempotentCreateMap?: Map<string, string>;
  idempotentInvoiceMap?: Map<string, string>;
}): CommercialStripeAdapter {
  const accountId = options?.accountId ?? "acct_phase37i_test_fixture";
  const livemode = options?.livemode ?? false;
  const customers = options?.customers ?? [];
  const invoices = options?.invoices ?? [];
  const idempotentCreateMap = options?.idempotentCreateMap ?? new Map();
  const idempotentInvoiceMap = options?.idempotentInvoiceMap ?? new Map();
  let createSeq = 0;
  let invoiceSeq = 0;

  return {
    async verifyAccount() {
      if (options?.failVerify) throw new Error("fake_auth_failed");
      return { accountId, livemode };
    },
    async retrieveCustomer(customerId: string) {
      return customers.find((c) => c.id === customerId) ?? null;
    },
    async listCustomersByEmail(email: string, limit: number) {
      return customers
        .filter(
          (c) =>
            !c.deleted &&
            c.email &&
            c.email.toLowerCase() === email.trim().toLowerCase(),
        )
        .slice(0, limit);
    },
    async listCustomersByName(name: string, limit: number) {
      const needle = name.trim().toLowerCase();
      return customers
        .filter(
          (c) => !c.deleted && c.name && c.name.toLowerCase().includes(needle),
        )
        .slice(0, limit);
    },
    async searchCustomersByClientMetadata(clientId: number, limit: number) {
      return customers
        .filter(
          (c) =>
            !c.deleted &&
            c.metadata[KXD_STRIPE_CLIENT_METADATA_KEY] === String(clientId),
        )
        .slice(0, limit);
    },
    async createCustomer(params) {
      if (options?.createBehavior === "fail_network") {
        throw new Error("fake_network_error");
      }
      const priorId = idempotentCreateMap.get(params.idempotencyKey);
      if (priorId) {
        const prior = customers.find((c) => c.id === priorId);
        if (prior) return prior;
      }
      createSeq += 1;
      const created: CommercialStripeCustomerSnapshot = {
        id: `cus_phase37j_fake_${createSeq}`,
        name: params.name,
        email: params.email,
        deleted: false,
        livemode: false,
        created: 1_700_000_000 + createSeq,
        metadata: { ...params.metadata },
      };
      customers.push(created);
      idempotentCreateMap.set(params.idempotencyKey, created.id);
      return created;
    },
    async createAndFinalizeInvoice(params) {
      if (params.amountCents <= 0) throw new Error("Invoice amount must be positive.");
      const priorId = idempotentInvoiceMap.get(params.idempotencyKey);
      if (priorId) {
        const prior = invoices.find((i) => i.id === priorId);
        if (prior) return prior;
      }
      invoiceSeq += 1;
      const created: CommercialStripeInvoiceSnapshot = {
        id: `in_test_fake_${invoiceSeq}`,
        customerId: params.customerId,
        status: "open",
        livemode: false,
        amountDue: params.amountCents,
        amountPaid: 0,
        currency: params.currency.toUpperCase(),
        hostedInvoiceUrl: `https://invoice.stripe.com/i/test/fake_${invoiceSeq}`,
        paymentIntentId: `pi_test_fake_${invoiceSeq}`,
        metadata: { ...params.metadata },
      };
      invoices.push(created);
      idempotentInvoiceMap.set(params.idempotencyKey, created.id);
      return created;
    },
    async retrieveInvoice(invoiceId: string) {
      return invoices.find((i) => i.id === invoiceId) ?? null;
    },
  };
}
