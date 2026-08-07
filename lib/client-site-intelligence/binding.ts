/**
 * Client / source binding for Client Site Intelligence ingest.
 * Fail closed. Never infer client by display name.
 */

import type { Payload } from "payload";
import {
  ON_TRACK_PERFORMANCE_CLIENT_KEY,
  OTP_CARTS_CLIENT_KEY,
  type CsiSourceCredentialBinding,
} from "./constants";
import {
  ON_TRACK_PERFORMANCE_SEED_SLUG,
  OTP_CARTS_EXPECTED_SLUG,
} from "@/lib/client-launch/otp-carts-readiness";

export type BindClientSiteSourceResult =
  | {
      ok: true;
      clientId: number;
      clientKey: string;
      sourceSystem: string;
      resolvedSlug: string;
    }
  | {
      ok: false;
      reason:
        | "client_key_mismatch"
        | "source_system_mismatch"
        | "forbidden_client_key"
        | "client_not_found"
        | "ambiguous_client"
        | "otp_carts_otp_collision"
        | "slug_mismatch";
    };

export async function resolveClientByExactSlug(
  payload: Payload,
  slug: string,
): Promise<
  | { ok: true; clientId: number; slug: string }
  | { ok: false; reason: "client_not_found" | "ambiguous_client" | "slug_mismatch" }
> {
  const expected = slug.trim().toLowerCase();
  if (!expected) {
    return { ok: false, reason: "client_not_found" };
  }

  const found = await payload.find({
    collection: "clients",
    where: { slug: { equals: expected } },
    limit: 2,
    depth: 0,
    overrideAccess: true,
  });

  if (found.docs.length === 0) {
    return { ok: false, reason: "client_not_found" };
  }
  if (found.docs.length > 1) {
    return { ok: false, reason: "ambiguous_client" };
  }

  const doc = found.docs[0] as { id?: unknown; slug?: unknown };
  const id = Number(doc.id);
  const resolvedSlug = String(doc.slug ?? "")
    .trim()
    .toLowerCase();
  if (!Number.isFinite(id) || !resolvedSlug) {
    return { ok: false, reason: "client_not_found" };
  }
  // Defense: never accept a row whose stored slug does not exactly match the query key.
  if (resolvedSlug !== expected) {
    return { ok: false, reason: "slug_mismatch" };
  }
  return { ok: true, clientId: id, slug: resolvedSlug };
}

/** @deprecated Prefer resolveClientByExactSlug — kept for callers/tests. */
export async function resolveClientIdBySlug(
  payload: Payload,
  slug: string,
): Promise<{ ok: true; clientId: number } | { ok: false; reason: "client_not_found" | "ambiguous_client" }> {
  const resolved = await resolveClientByExactSlug(payload, slug);
  if (!resolved.ok) {
    if (resolved.reason === "ambiguous_client") {
      return { ok: false, reason: "ambiguous_client" };
    }
    return { ok: false, reason: "client_not_found" };
  }
  return { ok: true, clientId: resolved.clientId };
}

/**
 * Bind path clientKey + envelope fields to the credential registry and Payload client.
 * OTP Carts must never resolve to On Track Performance (`otp`).
 * Resolution is exact `clients.slug` equality only — never display name.
 */
export async function bindClientSiteSource(input: {
  pathClientKey: string;
  envelopeClientKey: string | null;
  envelopeSourceSystem: string | null;
  binding: CsiSourceCredentialBinding;
  payload: Payload;
}): Promise<BindClientSiteSourceResult> {
  const pathKey = input.pathClientKey.trim().toLowerCase();
  const envelopeKey = (input.envelopeClientKey ?? "").trim().toLowerCase();
  const envelopeSource = (input.envelopeSourceSystem ?? "").trim().toLowerCase();

  if (
    pathKey === ON_TRACK_PERFORMANCE_CLIENT_KEY ||
    envelopeKey === ON_TRACK_PERFORMANCE_CLIENT_KEY ||
    pathKey === ON_TRACK_PERFORMANCE_SEED_SLUG ||
    envelopeKey === ON_TRACK_PERFORMANCE_SEED_SLUG
  ) {
    return { ok: false, reason: "forbidden_client_key" };
  }

  if (input.binding.forbiddenClientKeys.some((k) => k === pathKey || k === envelopeKey)) {
    return { ok: false, reason: "forbidden_client_key" };
  }

  if (pathKey !== input.binding.clientKey) {
    return { ok: false, reason: "client_key_mismatch" };
  }
  if (!envelopeKey || envelopeKey !== input.binding.clientKey) {
    return { ok: false, reason: "client_key_mismatch" };
  }
  if (!envelopeSource || envelopeSource !== input.binding.sourceSystem) {
    return { ok: false, reason: "source_system_mismatch" };
  }

  // Explicit OTP Carts identity check — never merge with On Track Performance.
  if (
    input.binding.clientKey === OTP_CARTS_CLIENT_KEY &&
    input.binding.clientKey !== OTP_CARTS_EXPECTED_SLUG
  ) {
    return { ok: false, reason: "otp_carts_otp_collision" };
  }

  const resolved = await resolveClientByExactSlug(
    input.payload,
    input.binding.clientKey,
  );
  if (!resolved.ok) {
    return { ok: false, reason: resolved.reason };
  }

  // Defense: ensure OTP Carts id is not the same row as On Track Performance.
  if (input.binding.clientKey === OTP_CARTS_EXPECTED_SLUG) {
    const otpCollision = await resolveClientByExactSlug(
      input.payload,
      ON_TRACK_PERFORMANCE_SEED_SLUG,
    );
    if (otpCollision.ok && otpCollision.clientId === resolved.clientId) {
      return { ok: false, reason: "otp_carts_otp_collision" };
    }
  }

  return {
    ok: true,
    clientId: resolved.clientId,
    clientKey: input.binding.clientKey,
    sourceSystem: input.binding.sourceSystem,
    resolvedSlug: resolved.slug,
  };
}
