"use client";

import { usePathname } from "next/navigation";
import type { EditionBranding } from "@/lib/editions";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { ClientHqShell } from "./ClientHqShell";
import { resolvePortalNavId } from "@/lib/portal/nav";

export function ClientHqAppShell({
  children,
  companyName,
  editionBranding,
  experienceProfile,
}: {
  children: React.ReactNode;
  companyName?: string;
  editionBranding?: EditionBranding;
  experienceProfile?: ResolvedExperienceProfile;
}) {
  const pathname = usePathname();
  const activeId = resolvePortalNavId(pathname);

  return (
    <ClientHqShell
      activeId={activeId}
      companyName={companyName}
      editionBranding={editionBranding}
      experienceProfile={experienceProfile}
    >
      {children}
    </ClientHqShell>
  );
}
