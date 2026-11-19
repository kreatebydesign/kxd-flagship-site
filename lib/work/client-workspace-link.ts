/**
 * Client-safe work row client workspace href resolution.
 */

import { clientCommandCenterHref } from "@/lib/quick-actions/routes";
import type { WorkListItem } from "./types";

export type WorkClientLinkMode = "client-command" | "client-success" | "none";

export function resolveWorkClientHref(
  item: Pick<WorkListItem, "clientId" | "clientSuccessHref">,
  mode: WorkClientLinkMode,
): string | null {
  if (item.clientId == null) return null;
  if (mode === "none") return null;
  if (mode === "client-command") {
    return clientCommandCenterHref(item.clientId);
  }
  return item.clientSuccessHref;
}