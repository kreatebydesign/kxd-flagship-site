import Link from "next/link";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export default function PortalSegmentNotFound() {
  return (
    <main className="kxd-ces-app" style={{ minHeight: "100dvh", padding: "2.5rem 1.25rem" }}>
      <div style={{ maxWidth: "28rem", margin: "0 auto" }}>
        <p className="kxd-ces-eyebrow" style={{ marginBottom: "0.75rem" }}>
          {PORTAL_CLIENT_LANGUAGE.workspaceLabel}
        </p>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          Page not found
        </h1>
        <p style={{ opacity: 0.78, marginBottom: "1.5rem", lineHeight: 1.55 }}>
          This page isn&apos;t available in your workspace. It may have moved,
          or you may not have access to it.
        </p>
        <Link href="/portal" className="kxd-ces-btn kxd-ces-btn--primary">
          Back to workspace
        </Link>
      </div>
    </main>
  );
}
