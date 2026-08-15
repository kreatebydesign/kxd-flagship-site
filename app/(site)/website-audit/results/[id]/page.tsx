import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { AuditResultsFollowUp } from "@/components/website-audit/AuditResultsFollowUp";
import {
  buildAuditNextSteps,
  buildIntelligenceStartProjectHref,
} from "@/lib/website-audit/next-steps";
import { GRADE_COLOR } from "@/lib/website-audit/scoring";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildMetadata({
    title: "Your Website Audit Results",
    description: "KXD Intelligence scorecard and improvement opportunities.",
    path: `/website-audit/results/${id}`,
    noIndex: true,
  });
}

function parseLines(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

function ScoreBar({
  label,
  score,
  whyItMatters,
  problemCategory,
}: {
  label: string;
  score: number;
  whyItMatters: string;
  problemCategory: string;
}) {
  const color = score >= 80 ? "#5ec68c" : score >= 65 ? "#f0be50" : "#d25a5a";
  return (
    <div>
      <div className="flex justify-between gap-4">
        <span
          className="font-sans uppercase"
          style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}
        >
          {label}
        </span>
        <span className="font-sans" style={{ fontSize: "0.75rem", color }}>
          {score}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        <div style={{ flex: score, height: "2px", background: color }} />
        <div style={{ flex: 100 - score, height: "2px", background: "rgba(255,255,255,0.08)" }} />
      </div>
      <p
        className="mt-2 font-sans font-light"
        style={{ fontSize: "0.6875rem", lineHeight: 1.55, color: "rgba(255,255,255,0.38)" }}
      >
        <span style={{ color: "rgba(255,255,255,0.5)" }}>{problemCategory}.</span>{" "}
        {whyItMatters}
      </p>
    </div>
  );
}

export default async function WebsiteAuditResultsPage({ params }: Props) {
  const { id } = await params;
  const auditId = Number(id);
  if (!Number.isFinite(auditId)) notFound();

  const payload = await getPayload({ config });

  let audit;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audit = await payload.findByID({
      collection: "website-audits" as any,
      id: auditId,
      depth: 0,
      overrideAccess: true,
    });
  } catch {
    notFound();
  }

  const grade = String(audit.grade ?? "—");
  const gradeColor = GRADE_COLOR[grade as keyof typeof GRADE_COLOR] ?? "var(--kxd-gold)";
  const strengths = parseLines(audit.strengths as string);
  const opportunities = parseLines(audit.opportunities as string);
  const recommendations = parseLines(audit.recommendations as string);
  const overallScore = Number(audit.overallScore ?? 0);
  const website = String(audit.website ?? "");

  const nextSteps = buildAuditNextSteps({
    performanceScore: Number(audit.performanceScore ?? 0),
    seoScore: Number(audit.seoScore ?? 0),
    mobileScore: Number(audit.mobileScore ?? 0),
    conversionScore: Number(audit.conversionScore ?? 0),
    brandScore: Number(audit.brandScore ?? 0),
    overallScore,
  });

  const startHref = buildIntelligenceStartProjectHref({
    auditId,
    website,
    company: audit.company ? String(audit.company) : null,
    grade,
    overallScore,
  });

  const categoryByKey = Object.fromEntries(
    nextSteps.categories.map((c) => [c.key, c]),
  );

  return (
    <>
      <section
        style={{
          paddingTop: "calc(var(--nav-height) + 2.5rem)",
          paddingBottom: "2.5rem",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "58rem" }}>
          <p className="kxd-eyebrow">KXD Intelligence · Results</p>
          <h1
            className="mt-4 font-serif font-light"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: "var(--kxd-cream)" }}
          >
            {audit.company || audit.name}
          </h1>
          <p
            className="mt-2 font-sans font-light"
            style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)" }}
          >
            {website}
          </p>

          <div className="mt-10 flex flex-wrap items-end gap-8">
            <div>
              <p
                className="font-sans uppercase"
                style={{ fontSize: "0.5rem", letterSpacing: "0.16em", color: "rgba(255,255,255,0.35)" }}
              >
                Overall Score
              </p>
              <p
                className="mt-2 font-serif font-light"
                style={{
                  fontSize: "clamp(3rem, 6vw, 4.5rem)",
                  color: "var(--kxd-cream)",
                  lineHeight: 1,
                }}
              >
                {overallScore}
              </p>
            </div>
            <div
              style={{
                border: `1px solid ${gradeColor}55`,
                background: `${gradeColor}12`,
                padding: "1rem 1.5rem",
              }}
            >
              <p
                className="font-sans uppercase"
                style={{ fontSize: "0.4375rem", letterSpacing: "0.16em", color: "rgba(255,255,255,0.35)" }}
              >
                KXD Grade
              </p>
              <p
                className="mt-1 font-serif font-light"
                style={{ fontSize: "2.5rem", color: gradeColor, lineHeight: 1 }}
              >
                {grade}
              </p>
            </div>
          </div>

          <p
            className="mt-8 font-serif font-light"
            style={{
              fontSize: "clamp(0.9375rem, 1.4vw, 1.0625rem)",
              lineHeight: 1.75,
              color: "var(--kxd-cream-muted)",
              maxWidth: "40rem",
            }}
          >
            Here&apos;s what the diagnostic found, why it matters, and where pressure is
            concentrating — so you can decide what to fix next.
          </p>
        </div>
      </section>

      <section className="kxd-container py-12 lg:py-14" style={{ maxWidth: "58rem" }}>
        <div className="grid gap-10 lg:grid-cols-2">
          <div
            style={{
              background: "var(--kxd-black-elevated)",
              border: "1px solid var(--kxd-border-white)",
              padding: "1.75rem",
            }}
          >
            <p className="kxd-eyebrow" style={{ opacity: 0.65 }}>
              Score Breakdown
            </p>
            <div className="mt-6 space-y-6">
              {(
                [
                  ["performance", "Performance", audit.performanceScore],
                  ["seo", "SEO", audit.seoScore],
                  ["mobile", "Mobile", audit.mobileScore],
                  ["conversion", "Conversion", audit.conversionScore],
                  ["brand", "Brand", audit.brandScore],
                ] as const
              ).map(([key, label, raw]) => {
                const meta = categoryByKey[key];
                return (
                  <ScoreBar
                    key={key}
                    label={label}
                    score={Number(raw ?? 0)}
                    whyItMatters={meta?.whyItMatters ?? ""}
                    problemCategory={meta?.problemCategory ?? "Site quality"}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {nextSteps.weakest.length > 0 && (
              <div
                style={{
                  background: "var(--kxd-black-elevated)",
                  border: "1px solid var(--kxd-border-white)",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="font-sans uppercase"
                  style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "var(--kxd-gold)" }}
                >
                  Primary Pressure
                </p>
                <ul className="mt-4 space-y-3">
                  {nextSteps.weakest.map((item) => (
                    <li key={item.key}>
                      <p
                        className="font-serif font-light"
                        style={{ fontSize: "0.9375rem", color: "var(--kxd-cream)" }}
                      >
                        {item.label} · {item.problemCategory}
                      </p>
                      <p
                        className="mt-1 font-sans font-light"
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--kxd-cream-muted)",
                          lineHeight: 1.6,
                        }}
                      >
                        {item.whyItMatters}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {strengths.length > 0 && (
              <div
                style={{
                  background: "var(--kxd-black-elevated)",
                  border: "1px solid var(--kxd-border-white)",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="font-sans uppercase"
                  style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "var(--kxd-gold)" }}
                >
                  Strengths
                </p>
                <ul className="mt-4 space-y-2">
                  {strengths.map((s) => (
                    <li
                      key={s}
                      className="font-sans font-light"
                      style={{ fontSize: "0.8125rem", color: "var(--kxd-cream-muted)", lineHeight: 1.6 }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {opportunities.length > 0 && (
              <div
                style={{
                  background: "var(--kxd-black-elevated)",
                  border: "1px solid var(--kxd-border-white)",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="font-sans uppercase"
                  style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "#f0be50" }}
                >
                  Improvement Opportunities
                </p>
                <ul className="mt-4 space-y-2">
                  {opportunities.map((s) => (
                    <li
                      key={s}
                      className="font-sans font-light"
                      style={{ fontSize: "0.8125rem", color: "var(--kxd-cream-muted)", lineHeight: 1.6 }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {recommendations.length > 0 && (
          <div
            className="mt-10"
            style={{
              background: "rgba(197,166,92,0.06)",
              border: "1px solid var(--kxd-border-gold)",
              padding: "1.75rem",
            }}
          >
            <p className="kxd-eyebrow">Reasonable Next Steps</p>
            <ul className="mt-4 space-y-3">
              {recommendations.map((r) => (
                <li
                  key={r}
                  className="font-sans font-light"
                  style={{ fontSize: "0.9375rem", color: "var(--kxd-cream-soft)", lineHeight: 1.65 }}
                >
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <AuditResultsFollowUp
          auditId={auditId}
          website={website}
          grade={grade}
          overallScore={overallScore}
          summary={nextSteps.summary}
          startHref={startHref}
          capabilities={nextSteps.capabilities}
          proof={nextSteps.proof}
        />
      </section>
    </>
  );
}
