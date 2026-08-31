"use client";

import { usePathname } from "next/navigation";
import type { EditionBranding } from "@/lib/editions";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { PortalAccountSwitcherModel } from "@/lib/portal/account-context-types";
import { ClientHqShell } from "./ClientHqShell";
import { resolvePortalNavId } from "@/lib/portal/nav";

export function ClientHqAppShell({
  children,
  companyName,
  editionBranding,
  experienceProfile,
  accountSwitcher = null,
  portfolioNavAvailable = false,
  billingNavAvailable = false,
  commercialNavAvailable = false,
  websiteEditorUrl = null,
  operatorPreview = null,
}: {
  children: React.ReactNode;
  companyName?: string;
  editionBranding?: EditionBranding;
  experienceProfile?: ResolvedExperienceProfile;
  accountSwitcher?: PortalAccountSwitcherModel | null;
  portfolioNavAvailable?: boolean;
  billingNavAvailable?: boolean;
  commercialNavAvailable?: boolean;
  websiteEditorUrl?: string | null;
  operatorPreview?: {
    clientId: number;
    clientName: string;
    mode?: "preview" | "staff-test";
  } | null;
}) {
  const pathname = usePathname();
  const activeId = resolvePortalNavId(pathname);

  return (
    <ClientHqShell
      activeId={activeId}
      pathname={pathname}
      companyName={companyName}
      editionBranding={editionBranding}
      experienceProfile={experienceProfile}
      accountSwitcher={operatorPreview ? null : accountSwitcher}
      portfolioNavAvailable={operatorPreview ? false : portfolioNavAvailable}
      billingNavAvailable={billingNavAvailable}
      commercialNavAvailable={commercialNavAvailable}
      websiteEditorUrl={websiteEditorUrl}
      operatorPreview={operatorPreview}
    >
      {children}
    </ClientHqShell>
  );
}
