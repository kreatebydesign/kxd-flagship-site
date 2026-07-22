/**
 * Phase 37I/37J — Injectable Stripe commercial adapter.
 * Reads: account + customers. Write: customers.create only (Phase 37J test mode).
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
};

function asMetadata(meta: Stripe.Metadata | null | undefined): Record<string, string> {
  if (!meta || typeof meta !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function mapCustomer(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
  livemodeFallback: boolean,
): CommercialStripeCustomerSnapshot {
  if ("deleted" in customer && customer.deleted) {
    return {
      id: customer.id,
      name: null,
      email: null,
      deleted: true,
      livemode: livemodeFallback,
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
    livemode: Boolean(
      (live as { livemode?: boolean }).livemode ?? livemodeFallback,
    ),
    created: typeof live.created === "number" ? live.created : null,
    metadata: asMetadata(live.metadata),
  };
}

/**
 * Real Stripe adapter — account/customer reads + customers.create only.
 * Must never call customer update/delete or subscription/invoice/checkout APIs.
 */
export function createLiveCommercialStripeAdapter(
  stripe: Stripe,
): CommercialStripeAdapter {
  return {
    async verifyAccount() {
      const account = await stripe.accounts.retrieve();
      const livemode = Boolean((account as { livemode?: boolean }).livemode);
      return { accountId: account.id, livemode };
    },
    async retrieveCustomer(customerId: string) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        return mapCustomer(customer, false);
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
      const livemode = Boolean((list as { livemode?: boolean }).livemode);
      return list.data.map((row) => mapCustomer(row, livemode));
    },
    async listCustomersByName(name: string, limit: number) {
      try {
        const escaped = name.replace(/'/g, "\\'");
        const result = await stripe.customers.search({
          query: `name~'${escaped}'`,
          limit: Math.min(Math.max(limit, 1), 10),
        });
        const livemode = Boolean((result as { livemode?: boolean }).livemode);
        return result.data.map((row) => mapCustomer(row, livemode));
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
        const livemode = Boolean((result as { livemode?: boolean }).livemode);
        return result.data.map((row) => mapCustomer(row, livemode));
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
      return mapCustomer(customer, false);
    },
  };
}

/** Deterministic fake for isolated tests — never contacts Stripe. */
export function createFakeCommercialStripeAdapter(options?: {
  accountId?: string;
  livemode?: boolean;
  customers?: CommercialStripeCustomerSnapshot[];
  failVerify?: boolean;
  createBehavior?: "succeed" | "fail_network";
  /** When set, createCustomer returns this existing customer (idempotent replay). */
  idempotentCreateMap?: Map<string, string>;
}): CommercialStripeAdapter {
  const accountId = options?.accountId ?? "acct_phase37i_test_fixture";
  const livemode = options?.livemode ?? false;
  const customers = options?.customers ?? [];
  const idempotentCreateMap = options?.idempotentCreateMap ?? new Map();
  let createSeq = 0;

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
  };
}
