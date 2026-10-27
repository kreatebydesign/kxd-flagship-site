import "server-only";

import type { PayloadRequest } from "payload";
import { isFounderStudioOperator } from "@/payload/access/founder-studio-operator";

export function canAccessPlatformEconomics(user: PayloadRequest["user"]): boolean {
  return isFounderStudioOperator(user);
}
