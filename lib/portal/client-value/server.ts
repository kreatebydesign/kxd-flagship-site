/**
 * Server loader for allowlisted Care & Continuity fields.
 * Never returns secrets, property IDs, costs, or raw infrastructure docs.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { resolveInfrastructureForClient } from "@/lib/reporting/providers/connection-resolve";
import type { ComposeCareContinuityInput } from "./care-continuity";
import { CLIENT_VALUE_INFRA_ALLOWLIST } from "./types";

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

/**
 * Load allowlisted infrastructure fields for one authorized client.
 * Isolation: only docs matching clientId are considered.
 */
export async function loadClientValueCareInput(
  authorizedClientId: number,
): Promise<ComposeCareContinuityInput> {
  if (!Number.isFinite(authorizedClientId) || authorizedClientId <= 0) {
    return {};
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: authorizedClientId } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });

  const resolved = resolveInfrastructureForClient(
    authorizedClientId,
    result.docs as Array<Record<string, unknown>>,
  );
  if (resolved === "cross-client" || resolved == null) {
    return {};
  }

  // Explicit allowlist pick — never spread the infrastructure document.
  const allow = new Set<string>(CLIENT_VALUE_INFRA_ALLOWLIST);
  const out: ComposeCareContinuityInput = {};
  if (allow.has("hostingProvider")) {
    out.hostingProvider = asString(resolved.hostingProvider);
  }
  if (allow.has("nextRenewalDate")) {
    out.nextRenewalDate = asString(resolved.nextRenewalDate);
  }
  if (allow.has("domainExpirationDate")) {
    out.domainExpirationDate = asString(resolved.domainExpirationDate);
  }
  if (allow.has("primaryDomain")) {
    out.primaryDomain = asString(resolved.primaryDomain);
  }
  if (allow.has("domainAutoRenew")) {
    out.domainAutoRenew = asBool(resolved.domainAutoRenew);
  }

  return out;
}
