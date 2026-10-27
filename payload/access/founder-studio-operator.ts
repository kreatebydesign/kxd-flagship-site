import type { PayloadRequest } from "payload";
import { isFounderAllowlistEmail } from "@/lib/staff/founder-allowlist";
import { isStudioPayloadOperator } from "./index.ts";

/** Studio admin operators on the founder allowlist — Platform Economics and similar surfaces. */
export function isFounderStudioOperator(user: PayloadRequest["user"]): boolean {
  if (!isStudioPayloadOperator(user)) return false;
  const email = String(Reflect.get(user as object, "email") ?? "");
  return isFounderAllowlistEmail(email);
}
