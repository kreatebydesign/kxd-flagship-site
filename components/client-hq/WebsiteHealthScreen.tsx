import { KxdBadge, KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalWebsiteHealthData } from "@/lib/portal/types";
import { fmtPortalDate } from "@/lib/portal/format";

function signalVariant(status: string): "success" | "warning" | "pending" | "default" {
  if (status === "ok") return "success";
  if (status === "warning") return "warning";
  if (status === "pending") return "pending";
  return "default";
}

export function WebsiteHealthScreen({ data }: { data: PortalWebsiteHealthData }) {
  const audit = data.latestAudit;

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Intelligence"
        title="Website Health"
        lead="Domain, performance, SEO, and operational signals for your digital presence."
      />

      {data.domain ? (
        <p className="kxd-os-meta" style={{ marginBottom: "1.5rem" }}>
          {data.domain}
        </p>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {data.signals.map((signal) => (
          <article key={signal.id} className="kxd-os-card">
            <p className="kxd-os-metric__label">{signal.label}</p>
            <p className="kxd-os-card__title" style={{ marginTop: "0.35rem" }}>
              {signal.value}
            </p>
            <KxdBadge variant={signalVariant(signal.status)}>{signal.status}</KxdBadge>
            {signal.detail ? (
              <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
                {signal.detail}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {audit ? (
        <section className="kxd-os-card" style={{ marginBottom: "2rem" }}>
          <p className="kxd-os-section__label">Latest audit</p>
          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "baseline" }}>
            <p className="kxd-os-metric__value">
              {audit.overallScore ?? "—"}
              {audit.grade ? <span className="kxd-os-meta"> · Grade {audit.grade}</span> : null}
            </p>
            <p className="kxd-os-meta">
              {audit.website} · {fmtPortalDate(audit.completedAt)}
            </p>
          </div>
          {audit.strengths.length > 0 ? (
            <div style={{ marginTop: "1.25rem" }}>
              <p className="kxd-os-metric__label">Strengths</p>
              <ul className="kxd-os-body" style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
                {audit.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : (
        <KxdEmptyState
          title="No audit on file"
          description="A KXD website audit will appear here when available. Request one from your account team."
        />
      )}

      {data.knownIssues.length > 0 ? (
        <section className="kxd-os-card">
          <p className="kxd-os-section__label">Known issues & opportunities</p>
          <ul className="kxd-os-body" style={{ marginTop: "0.75rem", paddingLeft: "1.25rem" }}>
            {data.knownIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
            AI recommendations coming soon.
          </p>
        </section>
      ) : null}
    </KxdPage>
  );
}
