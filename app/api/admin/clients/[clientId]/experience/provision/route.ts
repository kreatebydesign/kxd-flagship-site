/**
 * POST /api/admin/clients/[clientId]/experience/provision
 * Explicit dependency provisioning. Does not activate CES. Does not invite.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../../../payload/access/index";
import { parseRouteClientId, rejectBodyClientIdMismatch } from "@/lib/client-plans/validate";
import { applyExperienceProvision } from "@/lib/client-command/experience/composer/provision";
import type { ExperienceProvisionActionId } from "@/lib/client-command/experience/composer/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ACTIONS = new Set<ExperienceProvisionActionId>([
  "apply-search-console-site-url",
  "apply-discovered-ga4-property",
  "import-branding-logo",
  "import-branding-colors",
]);

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { ok: false, message: "Restricted staff cannot provision client experience." },
      { status: 403 },
    );
  }

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as {
      clientId?: unknown;
      actionId?: unknown;
      candidateValue?: unknown;
    };
    const identityError = rejectBodyClientIdMismatch(clientId, body);
    if (identityError) {
      return NextResponse.json({ ok: false, message: identityError }, { status: 400 });
    }

    const actionId = String(body.actionId ?? "") as ExperienceProvisionActionId;
    if (!ACTIONS.has(actionId)) {
      return NextResponse.json({ ok: false, message: "Unknown provisioning action." }, { status: 400 });
    }

    const candidateValue =
      typeof body.candidateValue === "string" ? body.candidateValue : null;
    const result = await applyExperienceProvision(clientId, { actionId, candidateValue });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    console.error("[KXD CES] Experience provision failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to apply provisioning action." },
      { status: 500 },
    );
  }
}
