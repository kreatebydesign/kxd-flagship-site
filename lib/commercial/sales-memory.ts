/**
 * Sales Memory — derived commercial memory + explicit operator activities.
 * Not a CRM activity feed. Prefer canonical events; operator notes are auditable.
 */
import "server-only";

import { cache } from "react";
import { getPayload } from "payload";
import config from "@payload-config";
import { relClientId } from "@/lib/financial-command/recurring-commercial-truth";
import { parseCommercialMarkers } from "./markers";
import { loadMoneyMovesSnapshot } from "./money-moves";
import type { SalesMemoryItem, SalesMemoryKind } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const ACTIVITY_KIND_MAP: Record<string, SalesMemoryKind> = {
  "commercial-trigger": "future_price_trigger",
  "payment-promised": "payment_promised",
  "renewal-notice": "renewal_approaching",
  "commission-follow-up": "commission_awaiting_confirmation",
  "commercial-review": "client_commercial_review",
  "follow-up": "proposal_follow_up",
  "proposal-sent": "proposal_follow_up",
};

export const loadSalesMemory = cache(async function loadSalesMemory(): Promise<{
  generatedAt: string;
  items: SalesMemoryItem[];
}> {
  const payload = await getPayload({ config });
  const [moves, activitiesR, clientsR] = await Promise.all([
    loadMoneyMovesSnapshot(),
    payload.find({
      collection: "sales-activities",
      limit: 80,
      depth: 0,
      overrideAccess: true,
      sort: "-occurredAt",
    }),
    payload.find({ collection: "clients", limit: 300, depth: 0, overrideAccess: true }),
  ]);

  const nameById = new Map<number, string>();
  for (const c of clientsR.docs as AnyDoc[]) {
    nameById.set(Number(c.id), String(c.name ?? "Client"));
  }

  const items: SalesMemoryItem[] = [];

  // Derived from Money Moves commercial states
  for (const move of moves.items) {
    let kind: SalesMemoryKind | null = null;
    if (move.kind === "planned_mrr_increase") kind = "future_price_trigger";
    else if (move.kind === "pending_mrr") kind = "project_launch_unlocks_recurring";
    else if (move.kind === "commission" && move.state === "VARIABLE_NEEDS_CONFIRMATION") {
      kind = "commission_awaiting_confirmation";
    } else if (move.kind === "annual_renewal" && move.state === "RENEWAL") {
      kind = "renewal_approaching";
    } else if (move.kind === "commercial_review") kind = "client_commercial_review";
    if (!kind) continue;
    items.push({
      id: `derived:${move.id}`,
      clientId: move.clientId,
      clientName: move.clientName,
      kind,
      title: move.title,
      summary: move.detail,
      occurredAt: moves.generatedAt,
      actionable: true,
      href: move.href,
      source: "derived",
    });
  }

  // Explicit operator / sales activities
  for (const act of activitiesR.docs as AnyDoc[]) {
    const type = String(act.activityType ?? "");
    const kind = ACTIVITY_KIND_MAP[type];
    if (!kind) continue;
    const clientId = relClientId(act.client);
    items.push({
      id: `activity:${act.id}`,
      clientId,
      clientName: clientId != null ? nameById.get(clientId) ?? null : null,
      kind,
      title: String(act.title ?? type),
      summary: String(act.summary ?? ""),
      occurredAt: String(act.occurredAt ?? act.createdAt ?? new Date().toISOString()),
      actionable: true,
      href: clientId
        ? `/admin/operations/client-command/${clientId}?tab=financial`
        : "/admin/sales/activities",
      source: "operator",
    });
  }

  // Markers on client notes that are not yet Money Moves (pricing class etc.)
  for (const client of clientsR.docs as AnyDoc[]) {
    const markers = parseCommercialMarkers(client.commercialNotes);
    for (const marker of markers) {
      if (marker.kind === "review-required") {
        // Already covered via money moves when classified
        continue;
      }
      if (marker.kind === "planned-mrr-increase" || marker.kind === "rate-correction") {
        // Covered via money moves / mutations
        continue;
      }
    }
  }

  // Dedupe by title+client
  const seen = new Set<string>();
  const deduped: SalesMemoryItem[] = [];
  for (const item of items) {
    const key = `${item.clientId ?? "x"}:${item.kind}:${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  deduped.sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)));

  return { generatedAt: new Date().toISOString(), items: deduped.slice(0, 60) };
});
