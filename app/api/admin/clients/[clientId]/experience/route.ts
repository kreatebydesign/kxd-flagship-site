/**
 * GET/PATCH /api/admin/clients/[clientId]/experience
 * Manage Client Experience — studio operators only. Route clientId is authoritative.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../../payload/access/index";
import { parseRouteClientId, rejectBodyClientIdMismatch } from "@/lib/client-plans/validate";
import {
  loadOperatorExperienceSnapshot,
  saveOperatorExperience,
  type OperatorExperienceSaveInput,
} from "@/lib/client-command/experience";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Restricted staff cannot manage client experience." },
    { status: 403 },
  );
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) return forbidden();

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  try {
    const snapshot = await loadOperatorExperienceSnapshot(clientId);
    if (!snapshot) {
      return NextResponse.json({ ok: false, message: "Client not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, experience: snapshot });
  } catch (err) {
    console.error("[KXD CES] Load experience failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to load client experience." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) return forbidden();

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Partial<OperatorExperienceSaveInput> & {
      clientId?: unknown;
      client?: unknown;
    };
    const identityError = rejectBodyClientIdMismatch(clientId, body);
    if (identityError) {
      return NextResponse.json({ ok: false, message: identityError }, { status: 400 });
    }

    const snapshot = await saveOperatorExperience(clientId, {
      profileStatus: body.profileStatus === "archived" ? "archived" : body.profileStatus === "draft" ? "draft" : "active",
      clientName: String(body.clientName ?? ""),
      portalSidebarLabel: String(body.portalSidebarLabel ?? ""),
      welcomeEyebrow: String(body.welcomeEyebrow ?? ""),
      reassuranceLine: String(body.reassuranceLine ?? ""),
      supportTone:
        body.supportTone === "direct" || body.supportTone === "formal"
          ? body.supportTone
          : "warm-professional",
      primaryColor: String(body.primaryColor ?? ""),
      secondaryColor: String(body.secondaryColor ?? ""),
      accentColor: String(body.accentColor ?? ""),
      borderRadiusPreset:
        body.borderRadiusPreset === "soft" || body.borderRadiusPreset === "sharp"
          ? body.borderRadiusPreset
          : "default",
      motionPreset:
        body.motionPreset === "calm" || body.motionPreset === "reduced"
          ? body.motionPreset
          : "default",
      showKxdPartnerMark: body.showKxdPartnerMark !== false,
      partnerFooterLine: String(body.partnerFooterLine ?? ""),
      terminology:
        body.terminology && typeof body.terminology === "object" ? body.terminology : {},
      selectedPortalModules: Array.isArray(body.selectedPortalModules)
        ? body.selectedPortalModules.map(String)
        : [],
    });

    return NextResponse.json({ ok: true, experience: snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to save experience.";
    const status =
      message.includes("not found") || message.includes("Invalid") || message.includes("cannot")
        ? 400
        : 500;
    if (status === 500) console.error("[KXD CES] Save experience failed:", err);
    return NextResponse.json({ ok: false, message }, { status });
  }
}
