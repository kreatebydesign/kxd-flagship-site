import "server-only";

import type { PayloadRequest } from "payload";

/**
 * Module-private symbols — not forgeable via JSON / REST request bodies.
 * Bypass is stored on `req` because Payload `createLocalReq` treats a context
 * object with only symbol keys as empty (`Object.keys` omits symbols) and
 * replaces `req.context`, dropping symbol-only authorization.
 */
const OPERATOR_CORRECTION_BYPASS = Symbol("kxdStaffTimeOperatorCorrectionBypass");
const OPERATOR_CORRECTION_BYPASS_REQ = Symbol(
  "kxdStaffTimeOperatorCorrectionBypassReq",
);

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

  const reqRecord = req as unknown as Record<symbol, unknown>;
  reqRecord[OPERATOR_CORRECTION_BYPASS_REQ] = true;

  return req;
}

function hasOperatorCorrectionBypassMarker(req: PayloadRequest): boolean {
  const reqRecord = req as unknown as Record<symbol, unknown>;
  if (reqRecord[OPERATOR_CORRECTION_BYPASS_REQ] === true) {
    return true;
  }

  if (!req.context || typeof req.context !== "object") {
    return false;
  }

  const contextRecord = req.context as Record<symbol, unknown>;
  return contextRecord[OPERATOR_CORRECTION_BYPASS] === true;
}

export async function isStaffTimeOperatorCorrectionAuthorized(
  req: PayloadRequest | undefined,
): Promise<boolean> {
  if (!req) {
    return false;
  }

  const stringContext = req.context as Record<string, unknown> | null | undefined;
  if (
    stringContext &&
    typeof stringContext === "object" &&
    stringContext[FORGED_STAFF_TIME_CORRECTION_CONTEXT_KEY] != null
  ) {
    return false;
  }

  if (!hasOperatorCorrectionBypassMarker(req)) {
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
