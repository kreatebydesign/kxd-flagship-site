/**
 * Versioned email templates for commercial lifecycle.
 * Local preview / simulated delivery only — no provider calls.
 */

export const EMAIL_TEMPLATE_VERSION = "kxd-lifecycle-email-2026-07-30";

export type LifecycleEmailKind =
  | "proposal-send"
  | "proposal-reminder"
  | "proposal-expiration"
  | "proposal-acceptance-confirmation"
  | "contract-send"
  | "contract-reminder"
  | "contract-execution-confirmation"
  | "billing-preparation-notice"
  | "payment-confirmation"
  | "onboarding-eligible-operator";

export interface LifecycleEmailContent {
  kind: LifecycleEmailKind;
  templateVersion: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

function wrapHtml(title: string, paragraphs: string[]): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 1rem;line-height:1.55">${p}</p>`).join("");
  return `<!doctype html><html><body style="font-family:Georgia,serif;color:#111;max-width:560px;margin:0 auto;padding:1.5rem">
<h1 style="font-size:1.25rem;font-weight:500;margin:0 0 1rem">${title}</h1>
${body}
<p style="margin-top:2rem;font-size:12px;opacity:.7">Kreate by Design · This message may be a local simulated delivery preview.</p>
</body></html>`;
}

export function buildLifecycleEmail(input: {
  kind: LifecycleEmailKind;
  recipientName: string;
  proposalNumber?: string;
  proposalTitle?: string;
  contractTitle?: string;
  secureUrl?: string;
  amountLabel?: string;
}): LifecycleEmailContent {
  const name = input.recipientName || "there";
  const proposal = input.proposalNumber
    ? `${input.proposalNumber}${input.proposalTitle ? ` — ${input.proposalTitle}` : ""}`
    : input.proposalTitle || "your proposal";
  const agreement = input.contractTitle || "your agreement";
  const link = input.secureUrl || "";

  const builders: Record<LifecycleEmailKind, () => { subject: string; paras: string[] }> = {
    "proposal-send": () => ({
      subject: `Proposal ${proposal} from Kreate by Design`,
      paras: [
        `Hello ${name},`,
        `Please review your proposal using the secure link below.`,
        link,
        `This link is private to you. Accepting authorizes preparation of a final agreement — it is not a signed contract.`,
      ],
    }),
    "proposal-reminder": () => ({
      subject: `Reminder: Proposal ${proposal}`,
      paras: [
        `Hello ${name},`,
        `A friendly reminder that your proposal is ready for review.`,
        link,
      ],
    }),
    "proposal-expiration": () => ({
      subject: `Proposal ${proposal} has expired`,
      paras: [
        `Hello ${name},`,
        `This proposal link is no longer active. Contact Kreate by Design if you would like a refreshed proposal.`,
      ],
    }),
    "proposal-acceptance-confirmation": () => ({
      subject: `We received your acceptance — ${proposal}`,
      paras: [
        `Hello ${name},`,
        `Thank you. We received your proposal acceptance and will prepare the final agreement for review. No payment has been collected through this step.`,
      ],
    }),
    "contract-send": () => ({
      subject: `Agreement ready for your signature — ${agreement}`,
      paras: [
        `Hello ${name},`,
        `Please review and electronically sign your agreement with Kreate by Design.`,
        link,
        `Signing creates a binding agreement. Typed signatures are electronic acknowledgments — not biometric identity verification.`,
      ],
    }),
    "contract-reminder": () => ({
      subject: `Reminder: signature needed — ${agreement}`,
      paras: [
        `Hello ${name},`,
        `Your agreement is still awaiting signature.`,
        link,
      ],
    }),
    "contract-execution-confirmation": () => ({
      subject: `Agreement fully executed — ${agreement}`,
      paras: [
        `Hello ${name},`,
        `Both parties have signed. Your executed agreement package is available through your secure link when authorized.`,
      ],
    }),
    "billing-preparation-notice": () => ({
      subject: `Billing plan prepared for review — ${agreement}`,
      paras: [
        `Operator notice: a proposed billing plan is ready for review. No live invoice or subscription was created.`,
      ],
    }),
    "payment-confirmation": () => ({
      subject: `Payment recorded (test/mock) — ${input.amountLabel || agreement}`,
      paras: [
        `A verified test/mock payment event was recorded for ${agreement}. Onboarding may become eligible but does not start automatically.`,
      ],
    }),
    "onboarding-eligible-operator": () => ({
      subject: `Onboarding eligible — ${agreement}`,
      paras: [
        `Initial payment evidence is verified. Onboarding is eligible and remains a manual operator action.`,
      ],
    }),
  };

  const built = builders[input.kind]();
  const title = built.subject;
  return {
    kind: input.kind,
    templateVersion: EMAIL_TEMPLATE_VERSION,
    subject: built.subject,
    bodyText: built.paras.join("\n\n"),
    bodyHtml: wrapHtml(title, built.paras),
  };
}
