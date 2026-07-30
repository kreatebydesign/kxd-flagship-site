/**
 * Priority action plan defaults from stored recommendations/opportunities.
 */

import { parseInsightLines } from "./findings.ts";
import {
  type ActionPlanGroup,
  type ActionPlanItem,
  type AuditReportSource,
  type ManualFinding,
} from "./types.ts";

function defaultGroup(text: string, index: number): ActionPlanGroup {
  const t = text.toLowerCase();
  if (
    t.includes("missing") ||
    t.includes("critical") ||
    t.includes("cta") ||
    t.includes("form") ||
    t.includes("viewport") ||
    index === 0
  ) {
    return "fix-first";
  }
  // Unresolved accessibility / HTTPS corrections are never defaulted to monitoring.
  if (/contrast|accessibility|keyboard focus|https|mixed[\s-]?content/.test(t)) {
    return "improve-next";
  }
  if (t.includes("seo") || t.includes("mobile") || t.includes("brand") || t.includes("typography")) {
    return "improve-next";
  }
  if (t.includes("growth") || t.includes("conversion") || t.includes("scheduling")) {
    return "growth";
  }
  if (
    /\b(continue (to )?monitor|ongoing (monitoring|verification)|periodically)\b/.test(t)
  ) {
    return "monitor";
  }
  return "improve-next";
}

export function buildDefaultActionPlan(
  source: AuditReportSource,
  manualFindings: ManualFinding[] = [],
): ActionPlanItem[] {
  const items: ActionPlanItem[] = [];
  let order = 0;

  parseInsightLines(source.recommendations).forEach((text, index) => {
    items.push({
      id: `rec-${index}`,
      sourceId: `recommendation-${index}`,
      sourceKind: "recommendation",
      group: defaultGroup(text, index),
      text,
      hidden: false,
      order: order++,
    });
  });

  // Include opportunities not already covered by recommendation text
  parseInsightLines(source.opportunities).forEach((text, index) => {
    const already = items.some(
      (i) => i.text.toLowerCase().includes(text.toLowerCase().slice(0, 40)),
    );
    if (already) return;
    items.push({
      id: `opp-plan-${index}`,
      sourceId: `opportunity-${index}`,
      sourceKind: "opportunity",
      group: defaultGroup(text, index + 2),
      text,
      hidden: false,
      order: order++,
    });
  });

  manualFindings.forEach((m) => {
    if (!m.recommendation?.trim()) return;
    items.push({
      id: `manual-plan-${m.id}`,
      sourceId: m.id,
      sourceKind: "manual",
      group: m.severity === "priority" ? "fix-first" : "improve-next",
      text: m.recommendation,
      hidden: Boolean(m.hidden),
      order: order++,
    });
  });

  return items;
}

export function normalizeActionPlan(items: ActionPlanItem[]): ActionPlanItem[] {
  return [...items]
    .map((item, index) => ({
      ...item,
      order: typeof item.order === "number" ? item.order : index,
      hidden: Boolean(item.hidden),
    }))
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}
