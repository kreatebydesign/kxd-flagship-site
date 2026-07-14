import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isLaunchWizardStepId } from "@/lib/client-launch-wizard/draft/parse";
import {
  abandonLaunchDraft,
  getLaunchDraft,
  saveLaunchDraftStep,
} from "@/lib/client-launch-wizard/server";
import type { LaunchWizardDraftPayload } from "@/lib/client-launch-wizard/types";
import { sanitizeLaunchFailureMessage } from "@/lib/client-launch-wizard/sanitize";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { draftId } = await context.params;
  const payload = await getPayload({ config });
  const draft = await getLaunchDraft(payload, draftId);
  if (!draft) {
    return NextResponse.json({ success: false, message: "Draft not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true, draft });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { draftId } = await context.params;
  let body: {
    stepId?: string;
    nextStep?: string;
    patch?: Partial<LaunchWizardDraftPayload>;
    expectedUpdatedAt?: string;
    action?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const payload = await getPayload({ config });

  if (body.action === "abandon") {
    const result = await abandonLaunchDraft(payload, draftId);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: sanitizeLaunchFailureMessage(result.message) },
        { status: result.status },
      );
    }
    return NextResponse.json({ success: true, draft: result.draft });
  }

  if (!isLaunchWizardStepId(body.stepId)) {
    return NextResponse.json(
      { success: false, message: "Valid stepId is required." },
      { status: 400 },
    );
  }

  const result = await saveLaunchDraftStep({
    payload,
    draftId,
    stepId: body.stepId,
    nextStep: isLaunchWizardStepId(body.nextStep) ? body.nextStep : undefined,
    patch: body.patch ?? {},
    expectedUpdatedAt: body.expectedUpdatedAt ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        message: sanitizeLaunchFailureMessage(result.message),
        issues: result.issues ?? [],
        draft: result.draft ?? null,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true, draft: result.draft });
}
