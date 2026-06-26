import { randomBytes, createHash } from "crypto";

export const CURRENT_AGREEMENT_VERSION = "1.0";
export const CURRENT_TERMS_VERSION = "1.0";

export function generatePublicToken(): string {
  return randomBytes(32).toString("base64url");
}

export function buildAcceptanceHash(input: {
  proposalId: number;
  signerEmail: string;
  agreementVersion: string;
  signedAt: string;
}): string {
  const payload = `${input.proposalId}:${input.signerEmail}:${input.agreementVersion}:${input.signedAt}`;
  return createHash("sha256").update(payload).digest("hex");
}

export function parseUserAgent(userAgent: string | null): { deviceType: string; browser: string } {
  const ua = userAgent ?? "";
  let deviceType = "desktop";
  if (/mobile|iphone|android/i.test(ua)) deviceType = "mobile";
  else if (/ipad|tablet/i.test(ua)) deviceType = "tablet";

  let browser = "unknown";
  if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/edg/i.test(ua)) browser = "Edge";

  return { deviceType, browser };
}

export function isProposalLinkValid(doc: {
  revoked?: boolean;
  publicTokenExpiresAt?: string | null;
  expiresAt?: string | null;
  status?: string;
}): boolean {
  if (doc.revoked) return false;
  const now = Date.now();
  if (doc.publicTokenExpiresAt) {
    const exp = new Date(String(doc.publicTokenExpiresAt)).getTime();
    if (!Number.isNaN(exp) && exp < now) return false;
  }
  if (doc.expiresAt && doc.status !== "approved") {
    const exp = new Date(String(doc.expiresAt)).getTime();
    if (!Number.isNaN(exp) && exp < now) return false;
  }
  return true;
}

export function calculateDepositAmount(proposal: {
  investment?: number | null;
  depositType?: string | null;
  depositPercent?: number | null;
  depositFixedAmount?: number | null;
  depositRequired?: boolean | null;
}): number {
  const investment = Number(proposal.investment ?? 0);
  if (!proposal.depositRequired || investment <= 0) return 0;

  const type = String(proposal.depositType ?? "percent-50");
  switch (type) {
    case "none":
      return 0;
    case "percent-25":
      return Math.round(investment * 0.25 * 100) / 100;
    case "percent-50":
      return Math.round(investment * 0.5 * 100) / 100;
    case "custom-percent": {
      const pct = Number(proposal.depositPercent ?? 50) / 100;
      return Math.round(investment * pct * 100) / 100;
    }
    case "fixed":
      return Number(proposal.depositFixedAmount ?? 0);
    case "full":
      return investment;
    default:
      return Math.round(investment * 0.5 * 100) / 100;
  }
}

export function isPaymentComplete(proposal: {
  investment?: number | null;
  depositRequired?: boolean | null;
  depositType?: string | null;
  paymentStatus?: string | null;
}): boolean {
  const deposit = calculateDepositAmount(proposal);
  if (deposit <= 0) return true;
  const status = String(proposal.paymentStatus ?? "none");
  return status === "deposit-paid" || status === "paid";
}
