"use client";

import { usePathname } from "next/navigation";
import { resolveClientIdFromPathname } from "@/lib/quick-actions/client-context";
import { ClientQuickActions } from "./ClientQuickActions";
import { GlobalQuickActions } from "./GlobalQuickActions";

export function QuickActionBar({ clientId: clientIdProp }: { clientId?: number }) {
  const pathname = usePathname();
  const clientId = clientIdProp ?? resolveClientIdFromPathname(pathname);

  if (clientId) {
    return <ClientQuickActions clientId={clientId} compact />;
  }

  return <GlobalQuickActions compact />;
}

export { QuickActionButton } from "./QuickActionButton";
export { GlobalQuickActions } from "./GlobalQuickActions";
export { ClientQuickActions } from "./ClientQuickActions";
