import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PartnerAppShell } from "@/components/partner";
import { getPartnerSession } from "@/lib/portal/partner/access";
import { getPortalSession } from "@/lib/portal/session";
import "../../../../design-system/os/styles/kxd-os.css";
import "../../../../design-system/partner/styles/kxd-partner.css";

export const metadata: Metadata = {
  title: "KXD Partner",
};

export default async function PartnerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login?redirect=/portal/partner");

  if (session.accessMode !== "partner") {
    redirect("/portal");
  }

  const partnerSession = await getPartnerSession();
  if (!partnerSession) redirect("/portal/login");

  const headerStore = await headers();
  const pathname = headerStore.get("x-kxd-pathname") || "/portal/partner";

  return (
    <PartnerAppShell
      pathname={pathname}
      partnerName={partnerSession.displayName}
      operatorPreview={
        partnerSession.isOperatorPreview
          ? {
              label:
                partnerSession.operatorPreview?.mode === "staff-test"
                  ? "KXD Staff Test Mode"
                  : "Operator Preview",
            }
          : null
      }
    >
      {children}
    </PartnerAppShell>
  );
}
