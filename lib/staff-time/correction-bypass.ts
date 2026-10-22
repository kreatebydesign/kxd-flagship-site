import "server-only";

import type { PayloadRequest } from "payload";

/** Module-private symbol — not forgeable via JSON / REST request bodies. */
const OPERATOR_CORRECTION_BYPASS = Symbol("kxdStaffTimeOperatorCorrectionBypass");

/** Legacy string key — never honored; presence without symbol is treated as forgery. */
export const FORGED_STAFF_TIME_CORRECTION_CONTEXT_KEY = "staffTimeOperatorCorrection";

export class ForgedStaffTimeCorrectionContextError extends Error {
  constructor() {
    super("FORGED_STAFF_TIME_CORRECTION_CONTEXT");
    this.name = "ForgedStaffTimeCorrectionContextError";
  }
}

async function hasActiveStaffTimeTransaction(
  req: PayloadRequest | undefined,
): Promise<boolean> {
  if (!req) return false;
  const transactionID = await Promise.resolve(req.transactionID ?? null);
  return transactionID != null && transactionID !== "";
}

export async function assertStaffTimeShiftInTransaction(
  req: PayloadRequest | undefined,
): Promise<void> {
  if (!(await hasActiveStaffTimeTransaction(req))) {
    throw new Error("STAFF_TIME_MUTATION_REQUIRES_TRANSACTION");
  }
}

export function withStaffTimeOperatorCorrectionContext<T extends PayloadRequest>(
  req: T,
): T {
  if (req.transactionID == null) {
    throw new Error("STAFF_TIME_CORRECTION_REQUIRES_TRANSACTION");
  }

  const context =
    req.context && typeof req.context === "object"
      ? { ...(req.context as Record<string, unknown>) }
      : ({} as Record<string, unknown>);

  delete context[FORGED_STAFF_TIME_CORRECTION_CONTEXT_KEY];

  const record = context as Record<string | symbol, unknown>;
  record[OPERATOR_CORRECTION_BYPASS] = true;
  req.context = context;
  return req;
}

export async function isStaffTimeOperatorCorrectionAuthorized(
  req: PayloadRequest | undefined,
): Promise<boolean> {
  if (!req?.context || typeof req.context !== "object") {
    return false;
  }

  const stringContext = req.context as Record<string, unknown>;
  if (stringContext[FORGED_STAFF_TIME_CORRECTION_CONTEXT_KEY] != null) {
    return false;
  }

  const record = req.context as Record<symbol, unknown>;
  if (record[OPERATOR_CORRECTION_BYPASS] !== true) {
    return false;
  }

  return hasActiveStaffTimeTransaction(req);
}

export async function assertNoForgedStaffTimeCorrectionContext(
  req: PayloadRequest | undefined,
): Promise<void> {
  if (!req?.context || typeof req.context !== "object") return;

  const forged =
    (req.context as Record<string, unknown>)[
      FORGED_STAFF_TIME_CORRECTION_CONTEXT_KEY
    ] != null;

  if (!forged) return;

  const authorized = await isStaffTimeOperatorCorrectionAuthorized(req);
  if (!authorized) {
    throw new ForgedStaffTimeCorrectionContextError();
  }
}
