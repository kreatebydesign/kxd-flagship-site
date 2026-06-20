import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalDashboard } from "@/lib/portal/data";
import { fmtPortalDate, statusLabel } from "@/lib/portal/format";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--kxd-black-elevated)",
        border: "1px solid var(--kxd-border-white)",
        padding: "1.5rem 1.75rem",
      }}
    >
      <p className="font-sans uppercase" style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)" }}>
        {label}
      </p>
      <p className="mt-2 font-serif font-light leading-none" style={{ fontSize: "clamp(2rem, 3.5vw, 2.5rem)", color: "var(--kxd-cream)" }}>
        {value}
      </p>
    </div>
  );
}

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const data = await getPortalDashboard(session);

  return (
    <div className="kxd-container py-10 lg:py-14">
      <div className="mb-10 border-b pb-8" style={{ borderColor: "var(--kxd-border-white)" }}>
        <p className="kxd-eyebrow" style={{ opacity: 0.55 }}>KXD Client Portal</p>
        <h1 className="mt-3 font-serif font-light" style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", color: "var(--kxd-cream)" }}>
          Welcome, {session.displayName}
        </h1>
        <p className="mt-2 font-sans font-light" style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)" }}>
          {session.clientName}
        </p>
        <div className="mt-5 flex flex-wrap gap-4">
          <div style={{ background: "rgba(197,166,92,0.06)", border: "1px solid var(--kxd-border-gold)", padding: "0.75rem 1.125rem" }}>
            <p className="font-sans uppercase" style={{ fontSize: "0.4375rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}>
              Onboarding Status
            </p>
            <p className="mt-1 font-sans" style={{ fontSize: "0.8125rem", color: "var(--kxd-gold)" }}>
              {data.onboardingStatus}
            </p>
          </div>
          <div style={{ background: "var(--kxd-black-elevated)", border: "1px solid var(--kxd-border-white)", padding: "0.75rem 1.125rem" }}>
            <p className="font-sans uppercase" style={{ fontSize: "0.4375rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}>
              Readiness Score
            </p>
            <p className="mt-1 font-serif font-light" style={{ fontSize: "1.25rem", color: "var(--kxd-cream)" }}>
              {data.readinessScore}%
            </p>
          </div>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-px lg:grid-cols-4" style={{ background: "var(--kxd-border-white)", border: "1px solid var(--kxd-border-white)" }}>
        <StatCard label="Active Projects" value={String(data.activeProjects)} />
        <StatCard label="Open Requests" value={String(data.openRequests)} />
        <StatCard label="Pending Deliverables" value={String(data.pendingDeliverables)} />
        <StatCard label="Completed Deliverables" value={String(data.completedDeliverables)} />
      </div>

      <section>
        <p className="mb-5 font-sans uppercase" style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.75 }}>
          Recent Activity
        </p>
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { title: "Projects", items: data.recentProjects, href: "/portal/projects", field: "projectName" },
            { title: "Requests", items: data.recentRequests, href: "/portal/requests", field: "requestTitle" },
            { title: "Deliverables", items: data.recentDeliverables, href: "/portal/deliverables", field: "title" },
          ].map((section) => (
            <div key={section.title} style={{ background: "var(--kxd-black-elevated)", border: "1px solid var(--kxd-border-white)" }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--kxd-border-white)" }}>
                <p className="font-sans uppercase" style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}>
                  {section.title}
                </p>
                <Link href={section.href} className="font-sans uppercase" style={{ fontSize: "0.4375rem", letterSpacing: "0.12em", color: "var(--kxd-gold)", opacity: 0.7, textDecoration: "none" }}>
                  View →
                </Link>
              </div>
              {section.items.length === 0 ? (
                <p className="px-5 py-6 font-sans" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)" }}>
                  No recent activity.
                </p>
              ) : (
                section.items.map((item, i) => (
                  <div
                    key={item.id as number}
                    className="px-5 py-4"
                    style={{ borderBottom: i < section.items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <p className="font-sans font-light" style={{ fontSize: "0.8125rem", color: "var(--kxd-cream-muted)" }}>
                      {String(item[section.field] ?? "—")}
                    </p>
                    <p className="mt-1 font-sans" style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)" }}>
                      {statusLabel(item.status as string)} · {fmtPortalDate(item.updatedAt as string)}
                    </p>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
