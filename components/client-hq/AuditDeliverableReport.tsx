"use client";

import type { AuditDeliverableViewModel } from "@/lib/reporting/branded-client/audit-deliverable";
import "./audit-deliverable-report.css";

function formatGeneratedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="kxd-audit-deliverable__list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function MetricCard({
  label,
  value,
  note,
  emphasis,
}: AuditDeliverableViewModel["metrics"][number]) {
  return (
    <article
      className={`kxd-audit-deliverable__metric${
        emphasis !== "default" ? ` kxd-audit-deliverable__metric--${emphasis}` : ""
      }`}
    >
      <p className="kxd-audit-deliverable__metric-label">{label}</p>
      <p className="kxd-audit-deliverable__metric-value">{value}</p>
      {note ? <p className="kxd-audit-deliverable__metric-note">{note}</p> : null}
    </article>
  );
}

export function AuditDeliverableReport({
  model,
  pdfHref,
}: {
  model: AuditDeliverableViewModel;
  pdfHref: string;
}) {
  return (
    <article
      className="kxd-audit-deliverable"
      style={{ ["--kxd-audit-accent" as string]: model.brandAccent }}
    >
      <header className="kxd-audit-deliverable__cover">
        <div className="kxd-audit-deliverable__cover-inner">
          {model.cover.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- client logo from CES profile
            <img
              src={model.cover.logoUrl}
              alt=""
              className="kxd-audit-deliverable__logo"
            />
          ) : null}
          <p className="kxd-audit-deliverable__eyebrow">{model.cover.eyebrow}</p>
          <div className="kxd-audit-deliverable__rule" aria-hidden />
          <h1 className="kxd-audit-deliverable__title">{model.cover.title}</h1>
          <p className="kxd-audit-deliverable__client">{model.cover.clientName}</p>
          <dl className="kxd-audit-deliverable__meta">
            <div>
              <dt>Audit period</dt>
              <dd>{model.cover.auditPeriodLabel}</dd>
            </div>
            <div>
              <dt>Repairs completed</dt>
              <dd>{model.cover.repairDateLabel}</dd>
            </div>
            <div>
              <dt>Prepared by</dt>
              <dd>{model.cover.preparedBy}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="kxd-audit-deliverable__toolbar">
        <a
          href={pdfHref}
          className="kxd-ces-btn kxd-ces-btn--primary kxd-audit-deliverable__download"
          download={model.pdfFilename}
        >
          Download PDF
        </a>
      </div>

      <div className="kxd-audit-deliverable__sheet">
        <section className="kxd-audit-deliverable__section" aria-labelledby="audit-exec-summary">
          <h2 id="audit-exec-summary" className="kxd-audit-deliverable__section-title">
            Executive summary
          </h2>
          <div className="kxd-audit-deliverable__prose">
            {model.executiveSummary.map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section
          className="kxd-audit-deliverable__section"
          aria-labelledby="audit-performance"
        >
          <h2 id="audit-performance" className="kxd-audit-deliverable__section-title">
            Verified performance snapshot
          </h2>
          <p className="kxd-audit-deliverable__lead">{model.performanceLead}</p>
          <div className="kxd-audit-deliverable__metric-grid">
            {model.metrics.map(({ key, ...metric }) => (
              <MetricCard key={key} {...metric} />
            ))}
          </div>
          <p className="kxd-audit-deliverable__disclaimer">{model.conversionDisclaimer}</p>
        </section>

        {model.sections.map((section) => (
          <section
            key={section.id}
            className={`kxd-audit-deliverable__section${
              section.variant === "callout"
                ? " kxd-audit-deliverable__section--callout"
                : ""
            }`}
            aria-labelledby={`audit-section-${section.id}`}
          >
            <h2
              id={`audit-section-${section.id}`}
              className="kxd-audit-deliverable__section-title"
            >
              {section.title}
            </h2>
            <div className="kxd-audit-deliverable__prose">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
            <BulletList items={section.bullets} />
          </section>
        ))}

        <footer className="kxd-audit-deliverable__closing">
          {model.closing.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
          <p className="kxd-audit-deliverable__closing-meta">
            {model.cover.preparedBy} · {model.closing.contactEmail} · Report version{" "}
            {model.closing.version} · Generated {formatGeneratedDate(model.closing.generatedAt)}
          </p>
        </footer>
      </div>
    </article>
  );
}
