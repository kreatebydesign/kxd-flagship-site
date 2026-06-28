"use client";

import { usePathname } from "next/navigation";
import type { EditionBranding } from "@/lib/editions";
import { ClientHqShell } from "./ClientHqShell";
import { CLIENT_HQ_NAV_GROUPS, clientHqNavIsActive, type ClientHqNavId } from "@/lib/portal/nav";

function resolveActiveNavId(pathname: string): ClientHqNavId {
  const allItems = CLIENT_HQ_NAV_GROUPS.flatMap((g) => g.items);
  const sorted = [...allItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find((item) => clientHqNavIsActive(pathname, item.href));
  return match?.id ?? "overview";
}

export function ClientHqAppShell({
  children,
  companyName,
  editionBranding,
}: {
  children: React.ReactNode;
  companyName?: string;
  editionBranding?: EditionBranding;
}) {
  const pathname = usePathname();
  const activeId = resolveActiveNavId(pathname);

  return (
    <ClientHqShell
      activeId={activeId}
      companyName={companyName}
      editionBranding={editionBranding}
    >
      {children}
    </ClientHqShell>
  );
}
