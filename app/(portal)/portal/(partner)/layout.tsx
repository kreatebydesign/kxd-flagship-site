import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PartnerAppShell } from "@/components/partner";
import { getPartnerSession } from "@/lib/portal/partner/access";
import { getPortalSession } from "@/lib/portal/session";
import "../../../../design-system/os/styles/kxd-os.css";
import "../../../../design-system/partner/styles/kxd-partner.css";

export const metadata: Metadata = {
  title: "KXD Network",
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

  return (
    <PartnerAppShell
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
