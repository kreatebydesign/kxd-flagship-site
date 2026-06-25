/**
 * /admin/operations/client-import
 * KXD OS — Client Import utility (internal admin only)
 */

import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { ClientImportTool } from "@/components/admin/operations/client-import/ClientImportTool";
import { LAUNCH_C } from "@/lib/client-launch/constants";

export const dynamic = "force-dynamic";

export default function ClientImportPage() {
  return (
    <div style={{ minHeight: "100vh", background: LAUNCH_C.bgBase, color: LAUNCH_C.cream }}>
      <header
        style={{
          borderBottom: `1px solid ${LAUNCH_C.border}`,
          padding: "1.25rem 1.5rem",
          background: "rgba(8,8,8,0.95)",
        }}
      >
        <div className="mx-auto max-w-screen-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <KxdLogo height={20} />
            <div>
              <Link
                href="/admin/operations/clients"
                style={{
                  fontFamily: LAUNCH_C.sans,
                  fontSize: "0.625rem",
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: LAUNCH_C.goldDim,
                  textDecoration: "none",
                }}
              >
                ← Client Portfolio
              </Link>
              <h1
                style={{
                  fontFamily: LAUNCH_C.serif,
                  fontWeight: 300,
                  fontSize: "1.875rem",
                  color: LAUNCH_C.cream,
                  marginTop: "0.375rem",
                  lineHeight: 1.1,
                }}
              >
                Client Import
              </h1>
              <p
                style={{
                  fontFamily: LAUNCH_C.sans,
                  fontSize: "0.8125rem",
                  color: LAUNCH_C.creamMuted,
                  marginTop: "0.375rem",
                  maxWidth: "36rem",
                  lineHeight: 1.6,
                }}
              >
                Paste structured JSON for an existing client. Import runs through the
                canonical launch workflow — creating or updating Client, Executive Profile,
                Retainer, and timeline without a second onboarding path.
              </p>
            </div>
          </div>
          <Link
            href="/admin/operations/client-launch"
            style={{
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: LAUNCH_C.goldDim,
              textDecoration: "none",
            }}
          >
            Client Launch →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-10">
        <ClientImportTool />
      </main>
    </div>
  );
}
