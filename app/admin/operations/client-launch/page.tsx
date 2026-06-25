/**
 * /admin/operations/client-launch
 * KXD OS — Guided Client Launch workflow
 */

import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { ClientLaunchWizard } from "@/components/admin/operations/client-launch/ClientLaunchWizard";
import { LAUNCH_C } from "@/lib/client-launch/constants";

export const dynamic = "force-dynamic";

export default function ClientLaunchPage() {
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
                ← Client Command Center
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
                Client Launch
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
                Launch a new KXD partnership — not just a database record. Guided onboarding
                into Client, Executive Profile, Retainer, and Workspace.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-10">
        <ClientLaunchWizard />
      </main>
    </div>
  );
}
