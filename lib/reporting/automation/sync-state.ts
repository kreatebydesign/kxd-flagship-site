/**
 * Phase 33A / 33A.1 — Persist / load per-(client, provider) sync state + leases.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ReportingProviderId } from "@/lib/reporting/providers/types";
import {
  REPORTING_AUTOMATION_PROVIDERS,
  REPORTING_EXECUTION_LEASE_MS,
} from "./constants";
import { withReportingAutomationDb } from "./db";
import {
  createReportingRunId,
  reportingLeaseExpiration,
  type ReportingExecutionStatus,
} from "./lease";
import type {
  ReportingIntegrationStatus,
  ReportingProviderSyncState,
  ReportingSyncOutcome,
} from "./types";

const COLLECTION = "reporting-sync-states";

const OUTCOMES: ReportingSyncOutcome[] = [
  "synced",
  "synced-empty",
  "skipped-not-entitled",
  "skipped-automation-disabled",
  "skipped-not-configured",
  "skipped-auth-unavailable",
  "skipped-awaiting-client",
  "skipped-window-complete",
  "lease-held",
  "unavailable",
  "unauthorized",
  "forbidden",
  "invalid",
  "timeout",
  "error",
  "deferred",
  "planned",
];

const STATUSES: ReportingIntegrationStatus[] = [
  "healthy",
  "not-entitled",
  "automation-disabled",
  "not-configured",
  "auth-unavailable",
  "awaiting-client",
  "temporarily-failing",
  "idle",
  "running",
];

function asProvider(value: unknown): ReportingProviderId | null {
  if (value === "search-console" || value === "ga4" || value === "ads") return value;
  return null;
}

function asOutcome(value: unknown): ReportingSyncOutcome | null {
  return typeof value === "string" && OUTCOMES.includes(value as ReportingSyncOutcome)
    ? (value as ReportingSyncOutcome)
    : null;
}

function asStatus(value: unknown): ReportingIntegrationStatus {
  return typeof value === "string" && STATUSES.includes(value as ReportingIntegrationStatus)
    ? (value as ReportingIntegrationStatus)
    : "idle";
}

function asExecution(value: unknown): ReportingExecutionStatus {
  return value === "running" ? "running" : "idle";
}

function isoOrNull(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function mapDoc(doc: Record<string, unknown>): ReportingProviderSyncState | null {
  const provider = asProvider(doc.provider);
  const clientRaw = doc.client;
  const clientId =
    typeof clientRaw === "number"
      ? clientRaw
      : clientRaw && typeof clientRaw === "object" && "id" in clientRaw
        ? Number((clientRaw as { id: number }).id)
        : null;
  if (!provider || clientId == null || !Number.isFinite(clientId)) return null;

  return {
    id: typeof doc.id === "number" ? doc.id : null,
    clientId,
    provider,
    automationEnabled: doc.automationEnabled !== false,
    integrationStatus: asStatus(doc.integrationStatus),
    lastSuccessfulSyncAt: isoOrNull(doc.lastSuccessfulSyncAt),
    lastFailedSyncAt: isoOrNull(doc.lastFailedSyncAt),
    failureReason: typeof doc.failureReason === "string" ? doc.failureReason : null,
    consecutiveFailures:
      typeof doc.consecutiveFailures === "number" && Number.isFinite(doc.consecutiveFailures)
        ? Math.max(0, Math.floor(doc.consecutiveFailures))
        : 0,
    nextScheduledSyncAt: isoOrNull(doc.nextScheduledSyncAt),
    lastCompletedWindowId:
      typeof doc.lastCompletedWindowId === "string" ? doc.lastCompletedWindowId : null,
    lastOutcome: asOutcome(doc.lastOutcome),
    lastFactsWritten:
      typeof doc.lastFactsWritten === "number" && Number.isFinite(doc.lastFactsWritten)
        ? Math.max(0, Math.floor(doc.lastFactsWritten))
        : 0,
    executionStatus: asExecution(doc.executionStatus),
    executionRunId: typeof doc.executionRunId === "string" ? doc.executionRunId : null,
    executionStartedAt: isoOrNull(doc.executionStartedAt),
    leaseExpiresAt: isoOrNull(doc.leaseExpiresAt),
    updatedAt: isoOrNull(doc.updatedAt),
  };
}

function emptyState(
  clientId: number,
  provider: ReportingProviderId,
): ReportingProviderSyncState {
  return {
    id: null,
    clientId,
    provider,
    automationEnabled: true,
    integrationStatus: "idle",
    lastSuccessfulSyncAt: null,
    lastFailedSyncAt: null,
    failureReason: null,
    consecutiveFailures: 0,
    nextScheduledSyncAt: null,
    lastCompletedWindowId: null,
    lastOutcome: null,
    lastFactsWritten: 0,
    executionStatus: "idle",
    executionRunId: null,
    executionStartedAt: null,
    leaseExpiresAt: null,
    updatedAt: null,
  };
}

export async function loadReportingProviderSyncStates(
  clientId: number,
): Promise<ReportingProviderSyncState[]> {
  if (!Number.isFinite(clientId) || clientId <= 0) return [];
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: { client: { equals: clientId } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  const mapped = result.docs
    .map((doc) => mapDoc(doc as Record<string, unknown>))
    .filter((row): row is ReportingProviderSyncState => row != null);

  const byProvider = new Map(mapped.map((row) => [row.provider, row]));
  return REPORTING_AUTOMATION_PROVIDERS.map(
    (provider) => byProvider.get(provider) ?? emptyState(clientId, provider),
  );
}

/**
 * Idempotent ensure of unique client+provider row. Races resolve via unique index.
 */
export async function ensureReportingProviderSyncState(input: {
  clientId: number;
  provider: ReportingProviderId;
}): Promise<ReportingProviderSyncState> {
  const payload = await getPayload({ config });
  const stateKey = `${input.clientId}:${input.provider}`;

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { client: { equals: input.clientId } },
        { provider: { equals: input.provider } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs[0]) {
    return mapDoc(existing.docs[0] as Record<string, unknown>) ?? emptyState(input.clientId, input.provider);
  }

  try {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      data: {
        stateKey,
        client: input.clientId,
        provider: input.provider,
        automationEnabled: true,
        integrationStatus: "idle",
        consecutiveFailures: 0,
        lastFactsWritten: 0,
        executionStatus: "idle",
      },
      overrideAccess: true,
    });
    return mapDoc(created as Record<string, unknown>) ?? emptyState(input.clientId, input.provider);
  } catch {
    // Unique race — reload.
    const raced = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      where: { stateKey: { equals: stateKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    return (
      mapDoc((raced.docs[0] ?? {}) as Record<string, unknown>) ??
      emptyState(input.clientId, input.provider)
    );
  }
}

export async function upsertReportingProviderSyncState(input: {
  clientId: number;
  provider: ReportingProviderId;
  automationEnabled?: boolean;
  integrationStatus?: ReportingIntegrationStatus;
  lastSuccessfulSyncAt?: string | null;
  lastFailedSyncAt?: string | null;
  failureReason?: string | null;
  consecutiveFailures?: number;
  nextScheduledSyncAt?: string | null;
  lastCompletedWindowId?: string | null;
  lastOutcome?: ReportingSyncOutcome | null;
  lastFactsWritten?: number;
  executionStatus?: ReportingExecutionStatus;
  executionRunId?: string | null;
  executionStartedAt?: string | null;
  leaseExpiresAt?: string | null;
}): Promise<ReportingProviderSyncState> {
  const ensured = await ensureReportingProviderSyncState(input);
  const payload = await getPayload({ config });
  if (ensured.id == null) {
    throw new Error("Unable to ensure reporting sync state row.");
  }

  const doc = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: ensured.id,
    data: {
      automationEnabled: input.automationEnabled ?? ensured.automationEnabled,
      integrationStatus: input.integrationStatus ?? ensured.integrationStatus,
      lastSuccessfulSyncAt:
        input.lastSuccessfulSyncAt !== undefined
          ? input.lastSuccessfulSyncAt
          : ensured.lastSuccessfulSyncAt,
      lastFailedSyncAt:
        input.lastFailedSyncAt !== undefined
          ? input.lastFailedSyncAt
          : ensured.lastFailedSyncAt,
      failureReason:
        input.failureReason !== undefined ? input.failureReason : ensured.failureReason,
      consecutiveFailures:
        input.consecutiveFailures !== undefined
          ? input.consecutiveFailures
          : ensured.consecutiveFailures,
      nextScheduledSyncAt:
        input.nextScheduledSyncAt !== undefined
          ? input.nextScheduledSyncAt
          : ensured.nextScheduledSyncAt,
      lastCompletedWindowId:
        input.lastCompletedWindowId !== undefined
          ? input.lastCompletedWindowId
          : ensured.lastCompletedWindowId,
      lastOutcome: input.lastOutcome !== undefined ? input.lastOutcome : ensured.lastOutcome,
      lastFactsWritten:
        input.lastFactsWritten !== undefined
          ? input.lastFactsWritten
          : ensured.lastFactsWritten,
      executionStatus: input.executionStatus ?? ensured.executionStatus,
      executionRunId:
        input.executionRunId !== undefined ? input.executionRunId : ensured.executionRunId,
      executionStartedAt:
        input.executionStartedAt !== undefined
          ? input.executionStartedAt
          : ensured.executionStartedAt,
      leaseExpiresAt:
        input.leaseExpiresAt !== undefined ? input.leaseExpiresAt : ensured.leaseExpiresAt,
      stateKey: `${input.clientId}:${input.provider}`,
    },
    overrideAccess: true,
  });

  return mapDoc(doc as Record<string, unknown>) ?? ensured;
}

export type AcquireReportingLeaseResult =
  | { ok: true; runId: string; leaseExpiresAt: string }
  | { ok: false; reason: "lease-held"; leaseExpiresAt: string | null; runId: string | null };

/**
 * Atomic DB lease acquire. Expired leases are reclaimable.
 */
export async function acquireReportingExecutionLease(input: {
  clientId: number;
  provider: ReportingProviderId;
  now?: Date;
  leaseMs?: number;
}): Promise<AcquireReportingLeaseResult> {
  await ensureReportingProviderSyncState(input);
  const now = input.now ?? new Date();
  const runId = createReportingRunId(now);
  const leaseExpiresAt = reportingLeaseExpiration(
    now,
    input.leaseMs ?? REPORTING_EXECUTION_LEASE_MS,
  ).toISOString();

  const acquired = await withReportingAutomationDb(async (client) => {
    const result = await client.query<{ id: number }>(
      `
      UPDATE reporting_sync_states
      SET
        execution_status = 'running',
        execution_run_id = $1,
        execution_started_at = $2::timestamptz,
        lease_expires_at = $3::timestamptz,
        integration_status = 'running',
        updated_at = NOW()
      WHERE client_id = $4
        AND provider = $5
        AND (
          execution_status IS DISTINCT FROM 'running'
          OR lease_expires_at IS NULL
          OR lease_expires_at < $2::timestamptz
        )
      RETURNING id
      `,
      [runId, now.toISOString(), leaseExpiresAt, input.clientId, input.provider],
    );
    return result.rowCount ?? 0;
  });

  if (acquired > 0) {
    return { ok: true, runId, leaseExpiresAt };
  }

  const held = await withReportingAutomationDb(async (client) => {
    const result = await client.query<{
      execution_run_id: string | null;
      lease_expires_at: Date | null;
    }>(
      `
      SELECT execution_run_id, lease_expires_at
      FROM reporting_sync_states
      WHERE client_id = $1 AND provider = $2
      LIMIT 1
      `,
      [input.clientId, input.provider],
    );
    return result.rows[0] ?? null;
  });

  return {
    ok: false,
    reason: "lease-held",
    runId: held?.execution_run_id ?? null,
    leaseExpiresAt: held?.lease_expires_at
      ? new Date(held.lease_expires_at).toISOString()
      : null,
  };
}

/**
 * Release lease only when runId still owns it (success, failure, timeout, finally).
 */
export async function releaseReportingExecutionLease(input: {
  clientId: number;
  provider: ReportingProviderId;
  runId: string;
}): Promise<void> {
  await withReportingAutomationDb(async (client) => {
    await client.query(
      `
      UPDATE reporting_sync_states
      SET
        execution_status = 'idle',
        execution_run_id = NULL,
        execution_started_at = NULL,
        lease_expires_at = NULL,
        updated_at = NOW()
      WHERE client_id = $1
        AND provider = $2
        AND execution_run_id = $3
      `,
      [input.clientId, input.provider, input.runId],
    );
  });
}

export type ClearExpiredReportingLeaseResult =
  | {
      ok: true;
      previousLeaseExpiresAt: string | null;
      executionStatus: "idle";
    }
  | {
      ok: false;
      reason: "lease-active" | "not-applicable";
      leaseExpiresAt: string | null;
      executionStatus: ReportingExecutionStatus;
    };

/**
 * Atomically clear only an expired/stale running lease.
 * Refuses active leases even if a concurrent sweep acquires between UI and request.
 */
export async function clearExpiredReportingExecutionLease(input: {
  clientId: number;
  provider: ReportingProviderId;
  now?: Date;
}): Promise<ClearExpiredReportingLeaseResult> {
  await ensureReportingProviderSyncState(input);
  const now = input.now ?? new Date();

  const atomic = await withReportingAutomationDb(async (client) => {
    const result = await client.query<{
      previous_lease_expires_at: Date | null;
      cleared: boolean;
      execution_status: string;
      lease_expires_at: Date | null;
    }>(
      `
      WITH target AS (
        SELECT id, lease_expires_at, execution_status
        FROM reporting_sync_states
        WHERE client_id = $1 AND provider = $2
        FOR UPDATE
      ),
      cleared AS (
        UPDATE reporting_sync_states AS s
        SET
          execution_status = 'idle',
          execution_run_id = NULL,
          execution_started_at = NULL,
          lease_expires_at = NULL,
          integration_status = CASE
            WHEN s.integration_status = 'running' THEN 'idle'
            ELSE s.integration_status
          END,
          updated_at = NOW()
        FROM target
        WHERE s.id = target.id
          AND target.execution_status = 'running'
          AND (
            target.lease_expires_at IS NULL
            OR target.lease_expires_at < $3::timestamptz
          )
        RETURNING target.lease_expires_at AS previous_lease_expires_at
      )
      SELECT
        (SELECT previous_lease_expires_at FROM cleared) AS previous_lease_expires_at,
        EXISTS(SELECT 1 FROM cleared) AS cleared,
        target.execution_status,
        target.lease_expires_at
      FROM target
      `,
      [input.clientId, input.provider, now.toISOString()],
    );
    return result.rows[0] ?? null;
  });

  if (!atomic) {
    return {
      ok: false,
      reason: "not-applicable",
      leaseExpiresAt: null,
      executionStatus: "idle",
    };
  }

  if (atomic.cleared) {
    return {
      ok: true,
      previousLeaseExpiresAt: atomic.previous_lease_expires_at
        ? new Date(atomic.previous_lease_expires_at).toISOString()
        : null,
      executionStatus: "idle",
    };
  }

  if (
    atomic.execution_status === "running" &&
    atomic.lease_expires_at &&
    new Date(atomic.lease_expires_at).getTime() > now.getTime()
  ) {
    return {
      ok: false,
      reason: "lease-active",
      leaseExpiresAt: new Date(atomic.lease_expires_at).toISOString(),
      executionStatus: "running",
    };
  }

  return {
    ok: false,
    reason: "not-applicable",
    leaseExpiresAt: atomic.lease_expires_at
      ? new Date(atomic.lease_expires_at).toISOString()
      : null,
    executionStatus: atomic.execution_status === "running" ? "running" : "idle",
  };
}
