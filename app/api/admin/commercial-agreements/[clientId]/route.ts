/**
 * GET/PATCH /api/admin/commercial-agreements/[clientId]
 * Read or save commercial terms on a client (operator-only).
 * Never mutates plan, entitlements, modules, or portal access.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  parseCommercialSaveBody,
} from "@/lib/commercial-agreements";
import {
  CommercialOpsError,
  getClientCommercialAgreement,
  saveClientCommercialAgreement,
} from "@/lib/commercial-agreements/ops-service";
import {
  parseRouteClientId,
  rejectBodyClientIdMismatch,
} from "@/lib/client-plans/validate";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (!clientId) {
    return NextResponse.json(
      { ok: false, message: "Invalid client id." },
      { status: 400 },
    );
  }

  try {
    const agreement = await getClientCommercialAgreement(clientId);
    return NextResponse.json({
      ok: true,
      agreement,
      notice:
        "Saving commercial terms does not activate a client plan or change access.",
    });
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message },
        { status: err.status },
      );
    }
    console.error("[KXD Commercial Ops] Detail failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to load commercial agreement." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (!clientId) {
    return NextResponse.json(
      { ok: false, message: "Invalid client id." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const mismatch = rejectBodyClientIdMismatch(clientId, body);
  if (mismatch) {
    return NextResponse.json({ ok: false, message: mismatch }, { status: 400 });
  }

  const parsed = parseCommercialSaveBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.message,
        fieldErrors: parsed.fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const actor =
      typeof auth.email === "string" && auth.email.trim()
        ? auth.email.trim()
        : `user:${auth.id}`;

    const agreement = await saveClientCommercialAgreement(
      clientId,
      parsed.input,
      actor,
    );

    return NextResponse.json({
      ok: true,
      agreement,
      message:
        "Commercial terms saved. Client plan, entitlements, and portal access were not changed.",
    });
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message },
        { status: err.status },
      );
    }
    console.error("[KXD Commercial Ops] Save failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to save commercial agreement." },
      { status: 500 },
    );
  }
}
