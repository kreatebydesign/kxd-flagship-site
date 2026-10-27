import type { PayloadRequest } from "payload";
import { isStudioPayloadOperator } from "./index.ts";

function founderEmailSet(): Set<string> {
  const raw =
    process.env.KXD_SCHEDULING_FOUNDER_EMAILS?.trim() ||
    process.env.KXD_INQUIRY_EMAIL?.trim() ||
    "matt@kreatebydesign.com";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Studio admin operators on the founder allowlist — Platform Economics and similar surfaces. */
export function isFounderStudioOperator(user: PayloadRequest["user"]): boolean {
  if (!isStudioPayloadOperator(user)) return false;
  const email = String(Reflect.get(user as object, "email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return false;
  return founderEmailSet().has(email);
}
