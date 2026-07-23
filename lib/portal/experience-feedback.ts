import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { PortalSession } from "@/lib/portal/session";

export const EXPERIENCE_FEEDBACK_TYPES = [
  "something-broken",
  "something-confusing",
  "feature-suggestion",
  "general",
] as const;

export type ExperienceFeedbackType = (typeof EXPERIENCE_FEEDBACK_TYPES)[number];

const FEEDBACK_TYPE_LABELS: Record<ExperienceFeedbackType, string> = {
  "something-broken": "Something broken",
  "something-confusing": "Something confusing",
  "feature-suggestion": "Feature suggestion",
  general: "General feedback",
};

export function isExperienceFeedbackType(
  value: unknown,
): value is ExperienceFeedbackType {
  return (
    typeof value === "string" &&
    (EXPERIENCE_FEEDBACK_TYPES as readonly string[]).includes(value)
  );
}

export type SubmitExperienceFeedbackInput = {
  session: PortalSession;
  feedbackType: ExperienceFeedbackType;
  message: string;
  /** Optional current portal path — never trusted for authorization. */
  pagePath?: string | null;
};

export type SubmitExperienceFeedbackResult =
  | { ok: true; id: number }
  | { ok: false; message: string };

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_PATH_LENGTH = 200;

/**
 * Early-access experience feedback — stores as an inbound client communication
 * so operators can triage in Client Command without a new subsystem.
 * Client identity is taken only from the authenticated portal session.
 */
export async function submitExperienceFeedback(
  input: SubmitExperienceFeedbackInput,
): Promise<SubmitExperienceFeedbackResult> {
  const message = input.message.trim();
  if (!message) {
    return { ok: false, message: "Please add a short message." };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      message: `Please keep feedback under ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  const pagePath =
    typeof input.pagePath === "string"
      ? input.pagePath.trim().slice(0, MAX_PATH_LENGTH)
      : "";
  const safePath =
    pagePath.startsWith("/portal") && !pagePath.includes("://") ? pagePath : "";

  const typeLabel = FEEDBACK_TYPE_LABELS[input.feedbackType];
  const subject = `Early access feedback · ${typeLabel}`;
  const summary = [
    typeLabel,
    safePath ? `Page: ${safePath}` : null,
    `From: ${input.session.displayName} <${input.session.email}>`,
  ]
    .filter(Boolean)
    .join(" · ");

  const payload = await getPayload({ config });

  try {
    const doc = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-communications" as any,
      data: {
        client: input.session.clientId,
        type: "form_submission",
        direction: "inbound",
        status: "needs_reply",
        priority: input.feedbackType === "something-broken" ? "high" : "normal",
        date: new Date().toISOString(),
        subject,
        summary,
        bodyPreview: message,
        contactName: input.session.displayName,
        contactEmail: input.session.email,
        source: "portal-experience-feedback",
        metadata: {
          feedbackType: input.feedbackType,
          pagePath: safePath || null,
          portalUserId: input.session.portalUserId,
          channel: "founding-client-early-access",
        },
      },
      overrideAccess: true,
    });

    console.info("[KXD Portal] Experience feedback received", {
      clientId: input.session.clientId,
      feedbackType: input.feedbackType,
      communicationId: doc.id,
      hasPagePath: Boolean(safePath),
    });

    return { ok: true, id: Number(doc.id) };
  } catch (err) {
    console.error("[KXD Portal] Experience feedback create failed:", err);
    return {
      ok: false,
      message: "We couldn't send your feedback just now. Please try again.",
    };
  }
}
