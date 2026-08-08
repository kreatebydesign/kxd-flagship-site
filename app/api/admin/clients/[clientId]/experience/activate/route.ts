/**
 * POST /api/admin/clients/[clientId]/experience/activate
 * Explicit Approve & Activate — the only composer write.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../../../payload/access/index";
import { parseRouteClientId, rejectBodyClientIdMismatch } from "@/lib/client-plans/validate";
import { activateRecommendedExperience } from "@/lib/client-command/experience/composer";
import type { ExperienceActivateInput } from "@/lib/client-command/experience/composer";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { ok: false, message: "Restricted staff cannot activate client experience." },
      { status: 403 },
    );
  }

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Partial<ExperienceActivateInput> & {
      clientId?: unknown;
    };
    const identityError = rejectBodyClientIdMismatch(clientId, body);
    if (identityError) {
      return NextResponse.json({ ok: false, message: identityError }, { status: 400 });
    }

    const branding = body.branding;
    if (!branding || typeof branding !== "object") {
      return NextResponse.json({ ok: false, message: "Branding is required." }, { status: 400 });
    }

    const experience = await activateRecommendedExperience(clientId, {
      acceptedModules: Array.isArray(body.acceptedModules)
        ? body.acceptedModules.map(String)
        : [],
      branding: {
        clientName: String(branding.clientName ?? ""),
        portalSidebarLabel: String(branding.portalSidebarLabel ?? ""),
        welcomeEyebrow: String(branding.welcomeEyebrow ?? ""),
        reassuranceLine: String(branding.reassuranceLine ?? ""),
        supportTone:
          branding.supportTone === "direct" || branding.supportTone === "formal"
            ? branding.supportTone
            : "warm-professional",
        primaryColor: String(branding.primaryColor ?? ""),
        secondaryColor: String(branding.secondaryColor ?? ""),
        accentColor: String(branding.accentColor ?? ""),
        borderRadiusPreset:
          branding.borderRadiusPreset === "soft" || branding.borderRadiusPreset === "sharp"
            ? branding.borderRadiusPreset
            : "default",
        motionPreset:
          branding.motionPreset === "calm" || branding.motionPreset === "reduced"
            ? branding.motionPreset
            : "default",
        showKxdPartnerMark: branding.showKxdPartnerMark !== false,
        partnerFooterLine: String(branding.partnerFooterLine ?? ""),
      },
    });

    return NextResponse.json({ ok: true, experience });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to activate experience.";
    const status =
      message.includes("not found") || message.includes("Invalid") || message.includes("cannot")
        ? 400
        : 500;
    if (status === 500) console.error("[KXD CES] Activate experience failed:", err);
    return NextResponse.json({ ok: false, message }, { status });
  }
}
