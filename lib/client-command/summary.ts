import "server-only";

import { fmtMoney, daysSince } from "@/lib/intelligence/context";
import type { ClientInsights, IntelligenceRecommendation } from "@/lib/intelligence/types";
import type { ClientHealthResult } from "@/lib/client-health/health-engine";
import type { CommandDoc } from "./types";

const HEALTH_GOOD = 75;
const HEALTH_ATTENTION = 60;

export function buildExecutiveBrief(input: {
  insights: ClientInsights | null;
  health: ClientHealthResult;
  proposals: CommandDoc[];
  reports: CommandDoc[];
  profile: CommandDoc | null;
  recommendations: IntelligenceRecommendation[];
}): string[] {
  const lines: string[] = [];
  const { insights, health, proposals, reports, profile, recommendations } = input;

  if (insights) {
    if (insights.relationship.status.toLowerCase().includes("healthy") || insights.relationship.highlights.length) {
      const rel = insights.relationship.highlights[0];
      lines.push(rel ?? "Relationship is stable.");
    }
    if (insights.relationship.concerns.length) {
      lines.push(insights.relationship.concerns[0]);
    }

    if (health.overallScore >= HEALTH_GOOD) {
      lines.push(`Website health is strong at ${health.overallScore}.`);
    } else if (health.overallScore >= HEALTH_ATTENTION) {
      lines.push(`Website health at ${health.overallScore} — monitor closely.`);
    } else if (health.overallScore > 0) {
      lines.push(`Website health needs attention (${health.overallScore}).`);
    }

    if (insights.infrastructure.highlights.some((h) => /operational|complete|score/i.test(h))) {
      lines.push("Infrastructure is fully operational.");
    } else if (insights.infrastructure.concerns.length) {
      lines.push(insights.infrastructure.concerns[0]);
    } else if (insights.infrastructure.status !== "unknown") {
      lines.push(`Infrastructure status: ${insights.infrastructure.status}.`);
    }

    if (insights.growth.highlights.length) {
      lines.push(insights.growth.highlights[0]);
    }

    if (insights.revenue.concerns.length) {
      lines.push(insights.revenue.concerns[0]);
    }
  }

  const draftProposals = proposals.filter((p) =>
    ["draft", "sent", "viewed"].includes(String(p.status)),
  );
  const topProposal = draftProposals.find((p) => p.monthlyAmount != null || p.totalAmount != null);
  if (topProposal) {
    const amount =
      topProposal.monthlyAmount != null
        ? fmtMoney(Number(topProposal.monthlyAmount))
        : topProposal.totalAmount != null
          ? fmtMoney(Number(topProposal.totalAmount))
          : null;
    if (amount) lines.push(`Proposal opportunity worth ~${amount}/mo.`);
  }

  const recReview = recommendations.find((r) =>
    /review|quarterly|check-in|follow-up/i.test(`${r.title} ${r.reason}`),
  );
  if (recReview) {
    lines.push(recReview.title.endsWith(".") ? recReview.title : `${recReview.title}.`);
  }

  const publishedReports = reports.filter((r) => r.status === "published");
  if (publishedReports.length === 0 && reports.length === 0) {
    lines.push("No monthly report published yet for this client.");
  }

  const strategicNote = profile?.strategicNotes ? String(profile.strategicNotes).trim() : "";
  if (strategicNote && lines.length < 6) {
    const sentence = strategicNote.split(/[.!?]/)[0]?.trim();
    if (sentence && sentence.length < 120) lines.push(sentence + ".");
  }

  if (lines.length === 0) {
    lines.push("Client command data loaded — review sections below for current status.");
  }

  return [...new Set(lines)].slice(0, 6);
}

export function formatYearsTogether(startIso: string | null | undefined): string {
  if (!startIso) return "—";
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return "—";
  const years = (Date.now() - start) / (365.25 * 86_400_000);
  if (years < 1) {
    const months = Math.max(1, Math.floor(years * 12));
    return `${months} mo`;
  }
  return `${years.toFixed(1)} yr`;
}

export function formatLastContact(iso: string | null | undefined): string {
  if (!iso) return "No contact recorded";
  const days = daysSince(iso);
  if (days == null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function estimateImpact(rec: IntelligenceRecommendation): string {
  if (rec.estimatedBusinessValue != null && rec.estimatedBusinessValue > 0) {
    return `${fmtMoney(rec.estimatedBusinessValue)}/mo potential`;
  }
  switch (rec.urgency) {
    case "critical":
      return "High — immediate attention";
    case "high":
      return "Significant operational impact";
    case "medium":
      return "Moderate business value";
    default:
      return "Incremental improvement";
  }
}
