"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ANALYTICS_EVENTS } from "@/lib/analytics/config";
import { trackPublicEvent } from "@/lib/analytics/track";
import type {
  AuditCapabilityLink,
  AuditProofLink,
} from "@/lib/website-audit/next-steps";

type Props = {
  auditId: number | string;
  website: string;
  grade: string;
  overallScore: number;
  summary: string;
  startHref: string;
  capabilities: AuditCapabilityLink[];
  proof: AuditProofLink[];
};

export function AuditResultsFollowUp({
  auditId,
  website,
  grade,
  overallScore,
  summary,
  startHref,
  capabilities,
  proof,
}: Props) {
  useEffect(() => {
    trackPublicEvent(ANALYTICS_EVENTS.intelligenceResultsViewed, {
      audit_id: String(auditId),
      grade,
      score: overallScore,
    });
  }, [auditId, grade, overallScore]);

  return (
    <div className="mt-12 space-y-10">
      <div
        style={{
          background: "var(--kxd-black-elevated)",
          border: "1px solid var(--kxd-border-white)",
          padding: "1.75rem",
        }}
      >
        <p className="kxd-eyebrow" style={{ opacity: 0.65 }}>
          What This Points Toward
        </p>
        <p
          className="mt-4 font-serif font-light"
          style={{
            fontSize: "clamp(1.0625rem, 1.6vw, 1.25rem)",
            lineHeight: 1.7,
            color: "var(--kxd-cream-soft)",
            maxWidth: "40rem",
          }}
        >
          {summary}
        </p>

        {capabilities.length > 0 && (
          <div className="mt-8 grid gap-px" style={{ background: "var(--kxd-border-white)" }}>
            {capabilities.map((cap) => (
              <Link
                key={cap.href}
                href={cap.href}
                className="block p-5 transition-colors hover:bg-[var(--kxd-black-base)]"
                style={{ background: "var(--kxd-black-pure)", textDecoration: "none" }}
              >
                <p
                  className="font-serif font-light"
                  style={{ fontSize: "1.0625rem", color: "var(--kxd-cream)" }}
                >
                  {cap.title}
                </p>
                <p
                  className="mt-2 font-sans font-light"
                  style={{
                    fontSize: "0.8125rem",
                    lineHeight: 1.65,
                    color: "var(--kxd-cream-muted)",
                    maxWidth: "36rem",
                  }}
                >
                  {cap.note}
                </p>
                <p
                  className="mt-3 font-sans uppercase"
                  style={{
                    fontSize: "0.5rem",
                    letterSpacing: "0.14em",
                    color: "var(--kxd-gold)",
                  }}
                >
                  Explore service →
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {proof.length > 0 && (
        <div>
          <p className="kxd-eyebrow" style={{ opacity: 0.65 }}>
            Related Proof
          </p>
          <p
            className="mt-3 font-sans font-light"
            style={{
              fontSize: "0.875rem",
              color: "var(--kxd-cream-muted)",
              maxWidth: "34rem",
              lineHeight: 1.7,
            }}
          >
            KXD has built related presence and growth work for established businesses —
            not generic template audits.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {proof.map((item) => (
              <Link
                key={item.slug}
                href={`/work/${item.slug}`}
                className="block p-5 transition-colors hover:bg-[var(--kxd-black-elevated)]"
                style={{
                  background: "var(--kxd-black-pure)",
                  border: "1px solid var(--kxd-border-white)",
                  textDecoration: "none",
                }}
              >
                <p
                  className="font-serif font-light"
                  style={{ fontSize: "1.0625rem", color: "var(--kxd-cream)" }}
                >
                  {item.title}
                </p>
                <p
                  className="mt-2 font-sans font-light"
                  style={{
                    fontSize: "0.8125rem",
                    lineHeight: 1.65,
                    color: "var(--kxd-cream-muted)",
                  }}
                >
                  {item.note}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          background: "var(--kxd-black-pure)",
          border: "1px solid var(--kxd-border-gold)",
          padding: "2rem 2rem 2.25rem",
        }}
      >
        <p className="kxd-eyebrow">Next Conversation</p>
        <h2
          className="mt-3 font-serif font-light"
          style={{
            fontSize: "clamp(1.35rem, 2.5vw, 1.75rem)",
            color: "var(--kxd-cream)",
          }}
        >
          If this diagnosis matches what you&apos;ve been feeling, talk with KXD about the
          right next build.
        </h2>
        <p
          className="mt-3 font-sans font-light"
          style={{
            fontSize: "0.875rem",
            color: "rgba(255,255,255,0.4)",
            maxWidth: "34rem",
            lineHeight: 1.7,
          }}
        >
          Your audit context travels with the application — so the first conversation can
          start from the actual site, not a blank brief. No obligation. No hard sell.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href={startHref}
            className="kxd-btn-primary font-sans uppercase"
            style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", textDecoration: "none" }}
            onClick={() =>
              trackPublicEvent(ANALYTICS_EVENTS.intelligenceStartProjectClick, {
                audit_id: String(auditId),
                website,
                grade,
                score: overallScore,
              })
            }
          >
            Continue with Start Project
          </Link>
          <Link
            href="/services"
            className="font-sans uppercase"
            style={{
              fontSize: "0.5625rem",
              letterSpacing: "0.14em",
              color: "var(--kxd-cream-muted)",
              textDecoration: "none",
            }}
          >
            Browse services →
          </Link>
        </div>
      </div>
    </div>
  );
}
