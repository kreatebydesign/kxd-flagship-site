/**
 * Phase 4 Batch J.2B — Read-only reporting provider probe (production OIDC path).
 *
 * POST /api/cron/reporting-probe
 * Auth: Authorization: Bearer $CRON_SECRET
 *
 * Never persists facts. Never entitles. Never prints secrets or raw payloads.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { isAuthorizedCronBearer } from "@/lib/reporting/ingest/cron-auth";
import { probeReportingProvider } from "@/lib/reporting/providers/probe";
import type { ReportingProviderId } from "@/lib/reporting/providers/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROVIDERS = new Set<ReportingProviderId>(["ga4", "search-console", "ads"]);

async function resolveClientId(body: {
  clientId?: unknown;
  clientSlug?: unknown;
}): Promise<{ ok: true; clientId: number } | { ok: false; error: string }> {
  if (typeof body.clientId === "number" && Number.isFinite(body.clientId) && body.clientId > 0) {
    return { ok: true, clientId: body.clientId };
  }
  const slug = typeof body.clientSlug === "string" ? body.clientSlug.trim() : "";
  if (!slug) return { ok: false, error: "clientId or clientSlug is required." };

  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: "clients",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (found.docs.length === 0) return { ok: false, error: "Client not found." };
  return { ok: true, clientId: Number(found.docs[0].id) };
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronBearer(request.headers.get("authorization"))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const providerRaw = String(body.provider ?? "");
  if (!PROVIDERS.has(providerRaw as ReportingProviderId)) {
    return NextResponse.json(
      { success: false, error: "provider must be ga4, search-console, or ads." },
      { status: 400 },
    );
  }

  const client = await resolveClientId(body);
  if (!client.ok) {
    return NextResponse.json(
      { success: false, error: client.error },
      { status: 400 },
    );
  }

  const result = await probeReportingProvider({
    clientId: client.clientId,
    provider: providerRaw as ReportingProviderId,
  });

  return NextResponse.json({
    success: result.ok,
    authMode: "cron-secret",
    provider: result.provider,
    providerAuthMode: result.authMode,
    serviceAccountEmail: result.serviceAccountEmail,
    developerTokenConfigured: result.developerTokenConfigured ?? null,
    scopes: result.scopes,
    apiVersion: result.apiVersion ?? null,
    resource: result.resource,
    message: result.message,
    rowCount: result.rowCount ?? null,
    persisted: false,
    entitled: false,
  });
}
