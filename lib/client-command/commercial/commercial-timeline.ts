import type { WorkspaceTimelineEvent } from "../workspace-types";
import type { LifecycleAuditEvent } from "@/lib/proposal-lifecycle/types";
import type { CommercialTimelineRow } from "./types";
import { commercialAgreementHref } from "./sections";

const COMMERCIAL_EVENT_PREFIXES = [
  "direct-agreement.",
  "contract.",
  "proposal.",
  "revenue.",
  "billing.",
];

const COMMERCIAL_KEYWORDS =
  /agreement|contract|proposal|payment|invoice|receipt|authorization|accept|activat|renew|change.?order|stripe|billing|commercial/i;

export function isCommercialTimelineEvent(event: WorkspaceTimelineEvent): boolean {
  const type = event.eventType || "";
  if (COMMERCIAL_EVENT_PREFIXES.some((p) => type.startsWith(p))) return true;
  if (event.category === "finance") return true;
  if (event.sourceModule === "Sales" || event.sourceModule === "Retainers") return true;
  return COMMERCIAL_KEYWORDS.test(`${type} ${event.title} ${event.summary}`);
}

export function mapWorkspaceTimelineToCommercial(
  events: WorkspaceTimelineEvent[],
): CommercialTimelineRow[] {
  return events
    .filter(isCommercialTimelineEvent)
    .map((e) => ({
      id: e.id,
      occurredAt: e.occurredAt,
      title: e.title,
      summary: e.summary || e.details || "",
      eventType: e.eventType,
      href: e.href,
    }))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export function mapAuditEventsToCommercial(
  clientId: number,
  contractId: number,
  events: LifecycleAuditEvent[] | undefined,
): CommercialTimelineRow[] {
  if (!events?.length) return [];
  return events.map((e) => ({
    id: `audit-${contractId}-${e.id}`,
    occurredAt: e.at,
    title: humanizeAuditAction(e.action),
    summary: e.reason || [e.fromStatus, e.toStatus].filter(Boolean).join(" → ") || "",
    eventType: e.action,
    href: commercialAgreementHref(clientId, contractId),
  }));
}

function humanizeAuditAction(action: string): string {
  const map: Record<string, string> = {
    "direct-agreement.created": "Agreement created",
    "direct-agreement.finalized": "Agreement sent",
    "direct-agreement.external-acceptance-recorded": "Accepted",
    "direct-agreement.authorization-recorded": "Authorization recorded",
    "direct-agreement.payment-recorded": "Payment recorded",
    "direct-agreement.payment-references-linked": "Payment linked",
    "direct-agreement.service-activated": "Service activated",
    "contract.created": "Agreement created",
    "contract.signed": "Agreement signed",
    "contract.sent": "Agreement sent",
  };
  return map[action] ?? action.replace(/^direct-agreement\./, "").replace(/[-.]/g, " ");
}

export function mergeCommercialTimeline(
  rows: CommercialTimelineRow[],
): CommercialTimelineRow[] {
  const seen = new Set<string>();
  const out: CommercialTimelineRow[] = [];
  for (const row of rows.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )) {
    const key = `${row.eventType}|${row.occurredAt}|${row.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
