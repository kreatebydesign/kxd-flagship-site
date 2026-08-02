/**
 * Phase 6 Batch C0 — organization-scoped meter storage primitives.
 *
 * In-memory store supports concurrent verification without a database.
 * Production path uses Payload collections via the service layer.
 */

import type { ConnectMeterKey, ConnectMeterPeriodKind } from "../types";
import { connectMeterAggregateKey } from "./period";

export type ConnectMeterAggregate = {
  organizationId: number;
  meterKey: ConnectMeterKey;
  periodKind: ConnectMeterPeriodKind;
  periodKey: string;
  quantity: number;
};

export type ConnectMeterIncrementInput = {
  organizationId: number;
  meterKey: ConnectMeterKey;
  periodKind: ConnectMeterPeriodKind;
  periodKey: string;
  delta: number;
  /** When set, replay of the same key must not double-count. */
  idempotencyKey?: string | null;
};

export type ConnectMeterIncrementResult =
  | {
      ok: true;
      quantity: number;
      applied: boolean;
      duplicate: boolean;
    }
  | { ok: false; reason: "invalid_organization" | "invalid_delta" | "cross_org" };

export interface ConnectMeterStore {
  increment(input: ConnectMeterIncrementInput): Promise<ConnectMeterIncrementResult>;
  read(input: {
    organizationId: number;
    meterKey: ConnectMeterKey;
    periodKind: ConnectMeterPeriodKind;
    periodKey: string;
  }): Promise<number>;
  listForOrganization(organizationId: number): Promise<ConnectMeterAggregate[]>;
}

/**
 * Concurrent-safe in-memory store using a serial queue per aggregate key.
 */
export class InMemoryConnectMeterStore implements ConnectMeterStore {
  private quantities = new Map<string, number>();
  private idempotency = new Map<string, true>();
  private queues = new Map<string, Promise<unknown>>();

  private enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    const prev = this.queues.get(key) ?? Promise.resolve();
    const next = prev.then(task, task);
    this.queues.set(
      key,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  async increment(
    input: ConnectMeterIncrementInput,
  ): Promise<ConnectMeterIncrementResult> {
    if (
      !Number.isFinite(input.organizationId) ||
      input.organizationId <= 0
    ) {
      return { ok: false, reason: "invalid_organization" };
    }
    if (!Number.isFinite(input.delta) || !Number.isInteger(input.delta)) {
      return { ok: false, reason: "invalid_delta" };
    }

    const aggregateKey = connectMeterAggregateKey(input);
    return this.enqueue(aggregateKey, async () => {
      if (input.idempotencyKey) {
        const idemKey = `${input.organizationId}:${input.idempotencyKey}`;
        if (this.idempotency.has(idemKey)) {
          return {
            ok: true as const,
            quantity: this.quantities.get(aggregateKey) ?? 0,
            applied: false,
            duplicate: true,
          };
        }
        this.idempotency.set(idemKey, true);
      }

      const next = (this.quantities.get(aggregateKey) ?? 0) + input.delta;
      this.quantities.set(aggregateKey, next);
      return {
        ok: true as const,
        quantity: next,
        applied: true,
        duplicate: false,
      };
    });
  }

  async read(input: {
    organizationId: number;
    meterKey: ConnectMeterKey;
    periodKind: ConnectMeterPeriodKind;
    periodKey: string;
  }): Promise<number> {
    return this.quantities.get(connectMeterAggregateKey(input)) ?? 0;
  }

  async listForOrganization(
    organizationId: number,
  ): Promise<ConnectMeterAggregate[]> {
    const prefix = `${organizationId}:`;
    const out: ConnectMeterAggregate[] = [];
    for (const [key, quantity] of this.quantities) {
      if (!key.startsWith(prefix)) continue;
      const [, meterKey, periodKind, periodKey] = key.split(":");
      out.push({
        organizationId,
        meterKey: meterKey as ConnectMeterKey,
        periodKind: periodKind as ConnectMeterPeriodKind,
        periodKey,
        quantity,
      });
    }
    return out;
  }

  /** Test helper — clears all state. */
  reset(): void {
    this.quantities.clear();
    this.idempotency.clear();
    this.queues.clear();
  }
}
