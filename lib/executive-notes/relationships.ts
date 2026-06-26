import "server-only";

import { clientId } from "@/lib/intelligence/context";
import type { IntelligenceContext } from "@/lib/intelligence/types";
import type { ExecutiveNoteDoc, RelationshipIntelligence } from "./types";

function noteText(doc: ExecutiveNoteDoc): string {
  return `${doc.title ?? ""} ${doc.summary ?? ""}`.trim();
}

function matches(doc: ExecutiveNoteDoc, patterns: RegExp): boolean {
  return patterns.test(noteText(doc));
}

export function buildRelationshipIntelligence(
  cid: number,
  notes: ExecutiveNoteDoc[],
  ctx: IntelligenceContext,
): RelationshipIntelligence {
  const clientNotes = notes.filter((n) => clientId(n.client) === cid && n.status !== "archived");
  const profile = ctx.executiveProfiles.find((p) => clientId(p.client) === cid);

  const openOpportunities: string[] = [];
  const promisesMade: string[] = [];
  const pendingFollowUps: string[] = [];
  const personalInformation: string[] = [];
  const businessGoals: string[] = [];
  const growthIdeas: string[] = [];
  const risks: string[] = [];
  const nextConversationTopics: string[] = [];

  for (const note of clientNotes) {
    const text = noteText(note);
    const type = String(note.noteType);

    if (type === "opportunity" || matches(note, /opportunity|upsell|expansion|proposal/i)) {
      openOpportunities.push(text);
    }
    if (matches(note, /promise|committed|will deliver|agreed to/i)) {
      promisesMade.push(text);
    }
    if (type === "follow-up" || note.reminderDate) {
      pendingFollowUps.push(text);
    }
    if (type === "personal" || matches(note, /birthday|family|personal|hobby/i)) {
      personalInformation.push(text);
    }
    if (type === "strategy" || matches(note, /goal|objective|priority|vision/i)) {
      businessGoals.push(text);
    }
    if (matches(note, /growth|expand|scale|new service/i)) {
      growthIdeas.push(text);
    }
    if (type === "internal" && matches(note, /risk|concern|churn|unhappy/i)) {
      risks.push(text);
    }
    if (note.priority === "high" || note.priority === "critical") {
      nextConversationTopics.push(text);
    }
  }

  if (profile?.growthOpportunities) growthIdeas.push(String(profile.growthOpportunities));
  if (profile?.upsellOpportunities) openOpportunities.push(String(profile.upsellOpportunities));
  if (profile?.riskNotes) risks.push(String(profile.riskNotes));
  if (profile?.nextAction) nextConversationTopics.push(String(profile.nextAction));

  const dedupe = (items: string[]) =>
    [...new Set(items.map((s) => s.trim()).filter(Boolean))].slice(0, 6);

  return {
    openOpportunities: dedupe(openOpportunities),
    promisesMade: dedupe(promisesMade),
    pendingFollowUps: dedupe(pendingFollowUps),
    personalInformation: dedupe(personalInformation),
    businessGoals: dedupe(businessGoals),
    growthIdeas: dedupe(growthIdeas),
    risks: dedupe(risks),
    nextConversationTopics: dedupe(nextConversationTopics),
  };
}
