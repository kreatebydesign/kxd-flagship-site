/**
 * Compose Executive Client Summary / Briefing from Executive Memory + live context.
 * Never invents deliveries or metrics.
 */

import {
  composeExecutiveMemorySlice,
  getExecutiveMemoryLens,
  type ExecutiveMemoryItem,
} from "@/lib/executive-memory";
import type {
  ExecutiveBriefingChapter,
  ExecutiveBriefingMetric,
  ExecutiveBriefingResults,
  ExecutiveBriefingWorkItem,
  ExecutiveClientBriefing,
  ExecutiveClientSummary,
  ExecutiveClientSummarySection,
} from "./types";

export type ComposeExecutiveClientSummaryInput = {
  clientId?: number | null;
  clientSlug: string;
  clientName?: string | null;
  reportingProviderLabels?: string[];
  periodLabel?: string | null;
  recommendationHeadline?: string | null;
  recommendationRationale?: string | null;
};

export type ComposeExecutiveClientBriefingInput = {
  clientId?: number | null;
  clientSlug: string;
  clientName?: string | null;
  results?: ExecutiveBriefingResults | null;
  recommendationHeadline?: string | null;
  recommendationRationale?: string | null;
  /** Live Website Review labels for awaiting nuance. */
  awaitingFromReviews?: ExecutiveBriefingWorkItem[];
};

function section(
  id: string,
  title: string,
  paragraphs: string[],
  bullets?: string[],
): ExecutiveClientSummarySection {
  return { id, title, paragraphs, bullets };
}

function lineFor(item: ExecutiveMemoryItem): string {
  return item.briefingStatement?.trim() || item.statement;
}

function inBriefing(
  item: ExecutiveMemoryItem,
  sectionId: NonNullable<ExecutiveMemoryItem["briefingSection"]>,
): boolean {
  if (item.briefingSection === "hidden") return false;
  if (item.evidenceStrength === "insufficient") return false;
  return (item.briefingSection ?? null) === sectionId;
}

function itemsFor(
  items: ExecutiveMemoryItem[],
  sectionId: NonNullable<ExecutiveMemoryItem["briefingSection"]>,
): ExecutiveMemoryItem[] {
  return items.filter((item) => inBriefing(item, sectionId));
}

export function composeExecutiveClientSummary(
  input: ComposeExecutiveClientSummaryInput,
): ExecutiveClientSummary | null {
  const briefing = composeExecutiveClientBriefing({
    clientId: input.clientId,
    clientSlug: input.clientSlug,
    clientName: input.clientName,
    recommendationHeadline: input.recommendationHeadline,
    recommendationRationale: input.recommendationRationale,
    results: {
      live: {
        periodLabel: input.periodLabel ?? null,
        providerLabels: input.reportingProviderLabels ?? [],
        metrics: [],
        note: null,
      },
      prepared: null,
    },
  });
  if (!briefing) return null;

  const sections: ExecutiveClientSummarySection[] = [
    section("opening", "Opening perspective", [briefing.opening.perspective]),
    section("relationship", "Relationship at a glance", [
      `${briefing.relationshipAtAGlance.phase}. Focus: ${briefing.relationshipAtAGlance.focus}. Next: ${briefing.relationshipAtAGlance.nextMilestone}.`,
    ]),
    section("built", "What we have built together", ["Delivered and active foundations:"], briefing.built),
    section("systems", "Systems currently active", ["Active partnership systems:"], briefing.systems),
    section(
      "marketing",
      "Marketing and visibility",
      briefing.marketing.length
        ? ["How the brand is being found and refined:"]
        : ["Marketing systems will appear here once verified in Executive Memory."],
      briefing.marketing.length ? briefing.marketing : undefined,
    ),
    section(
      "current",
      "Current work",
      briefing.currentWork.length
        ? briefing.currentWork.map((i) => i.statement)
        : ["Current focus is held calmly in the partnership rhythm."],
    ),
    section(
      "awaiting",
      "Awaiting your input",
      briefing.awaitingClient.length
        ? briefing.awaitingClient.map((i) => i.statement)
        : ["Nothing is waiting on you right now."],
    ),
    section(
      "next",
      "What comes next",
      briefing.whatComesNext.length
        ? ["Opportunities and next milestones:"]
        : ["Next steps will appear when authored in Executive Memory."],
      briefing.whatComesNext.length ? briefing.whatComesNext : undefined,
    ),
  ];

  if (briefing.platformOpportunity) {
    sections.push(
      section(
        "platform",
        briefing.platformOpportunity.title,
        [
          briefing.platformOpportunity.positioning,
          briefing.platformOpportunity.pricing.note,
        ],
        briefing.platformOpportunity.capabilities,
      ),
    );
  }

  return {
    clientId: briefing.clientId,
    clientSlug: briefing.clientSlug,
    clientName: briefing.clientName,
    headline: briefing.opening.headline,
    overview: briefing.opening.perspective,
    sections,
    nextSteps: briefing.recommendedNextSteps,
    composedAt: briefing.composedAt,
    sources: {
      memoryItemCount: getExecutiveMemoryLens(input.clientSlug)?.items.length ?? 0,
      reportingProviderLabels: input.reportingProviderLabels ?? [],
      periodLabel: input.periodLabel ?? null,
    },
  };
}

export function composeExecutiveClientBriefing(
  input: ComposeExecutiveClientBriefingInput,
): ExecutiveClientBriefing | null {
  const lens = getExecutiveMemoryLens(input.clientSlug);
  if (!lens || lens.items.length === 0) return null;

  const slice = composeExecutiveMemorySlice(input.clientSlug);
  if (!slice) return null;

  const clientName = input.clientName?.trim() || lens.clientName;
  const identity = lens.items.find((i) => i.kind === "identity");
  const relationship = lens.items.find((i) => i.kind === "relationship");

  const built = itemsFor(lens.items, "built").map(lineFor);
  const systems = itemsFor(lens.items, "systems").map(lineFor);
  const marketing = itemsFor(lens.items, "marketing").map(lineFor);

  const currentWork: ExecutiveBriefingWorkItem[] = itemsFor(lens.items, "current")
    .filter((i) => i.awaitingOwner !== "client")
    .map((item) => ({
      id: item.id,
      label: item.label,
      statement: lineFor(item),
      owner: "kxd" as const,
    }));

  const awaitingFromMemory: ExecutiveBriefingWorkItem[] = lens.items
    .filter(
      (item) =>
        item.awaitingOwner === "client" ||
        (item.briefingSection === "awaiting" && item.evidenceStrength !== "insufficient"),
    )
    .map((item) => ({
      id: item.id,
      label: item.label,
      statement: lineFor(item),
      owner: "client" as const,
    }));

  const awaitingClient = [
    ...awaitingFromMemory,
    ...(input.awaitingFromReviews ?? []).filter(
      (item) => !awaitingFromMemory.some((m) => m.id === item.id),
    ),
  ];

  const whatComesNext = itemsFor(lens.items, "next").map(lineFor);

  const platformItem = lens.items.find(
    (item) =>
      item.briefingSection === "platform" &&
      item.platformOpportunity &&
      item.evidenceStrength !== "insufficient",
  );

  const results: ExecutiveBriefingResults = input.results ?? {
    live: {
      periodLabel: null,
      providerLabels: [],
      metrics: [] as ExecutiveBriefingMetric[],
      note: "Live metrics appear when ReportingFacts exist for the selected period.",
    },
    prepared: null,
  };

  const recommendedNextSteps: string[] = [];
  if (awaitingClient[0]) {
    recommendedNextSteps.push(awaitingClient[0].statement);
  }
  if (input.recommendationHeadline) {
    recommendedNextSteps.push(input.recommendationHeadline);
  }
  if (input.recommendationRationale) {
    recommendedNextSteps.push(input.recommendationRationale);
  }
  const launch = lens.items.find((i) => i.id === "story-launch" || i.kind === "launch");
  if (launch && recommendedNextSteps.length < 3) {
    recommendedNextSteps.push(lineFor(launch));
  }
  if (platformItem?.platformOpportunity && recommendedNextSteps.length < 4) {
    recommendedNextSteps.push(platformItem.platformOpportunity.positioning);
  }
  if (recommendedNextSteps.length === 0) {
    recommendedNextSteps.push(
      "Continue refining what already serves the brand before expanding scope.",
    );
  }

  const phase =
    launch?.status === "planned"
      ? "Launch preparation"
      : relationship?.label ?? "Active partnership";

  const storyBeats = lens.items.filter(
    (i) => i.presentation?.storyBeatId && i.evidenceStrength !== "insufficient",
  );
  const journeyComplete = storyBeats.filter((i) => i.status !== "planned");
  const journeyAhead = storyBeats.filter((i) => i.status === "planned");

  const liveSentence =
    results.live.metrics.length > 0
      ? `Live reporting now reflects ${results.live.providerLabels.join(" and ") || "connected sources"}${
          results.live.periodLabel ? ` for ${results.live.periodLabel}` : ""
        } — signals leadership can trust without leaving this workspace.`
      : results.live.note;

  const preparedSentence = results.prepared
    ? `Alongside live facts, a prepared partnership report${
        results.prepared.periodLabel ? ` covering ${results.prepared.periodLabel}` : ""
      } remains available as historical advertising context — clearly separated from live ReportingFacts.`
    : null;

  const chapters: ExecutiveBriefingChapter[] = [
    {
      id: "origin",
      title: "How the partnership began",
      paragraphs: [
        identity?.statement ??
          `${clientName} partners with Kreate by Design to elevate digital presence and operating clarity.`,
        relationship?.statement ??
          "The relationship is active, oriented toward measured progress and calm leadership visibility.",
        journeyComplete.length > 0
          ? `From the outset, the work moved through a clear sequence: ${journeyComplete
              .map((i) => i.label.toLowerCase())
              .join("; ")}.`
          : "Early partnership direction was set together and continues to guide the work.",
      ].filter(Boolean) as string[],
    },
    {
      id: "built",
      title: "What stands today",
      paragraphs: [
        built.length > 0
          ? `What Kreate by Design has put in place: ${built.join(" ")}`
          : "Verified deliveries will appear here as the relationship memory grows.",
        systems.length > 0
          ? `Those foundations now operate as living systems: ${systems.join(" ")}`
          : null,
        marketing.length > 0
          ? `On visibility and demand: ${marketing.join(" ")}`
          : null,
      ].filter((p): p is string => Boolean(p)),
    },
    {
      id: "moment",
      title: "Where we are now",
      paragraphs: [
        currentWork.length > 0
          ? `Kreate by Design is presently focused on ${currentWork
              .map((i) => i.statement)
              .join(" ")}`
          : "Day-to-day focus remains calm and deliberate.",
        awaitingClient.length > 0
          ? `The clearest items awaiting ${clientName}: ${awaitingClient
              .map((i) => i.statement)
              .join(" ")}`
          : `Nothing material is waiting on ${clientName} in this briefing.`,
        journeyAhead.length > 0
          ? `Immediately ahead: ${journeyAhead.map((i) => lineFor(i)).join(" ")}`
          : null,
      ].filter((p): p is string => Boolean(p)),
    },
    {
      id: "evidence",
      title: "Evidence of progress",
      paragraphs: [
        liveSentence,
        preparedSentence,
        results.live.metrics.length === 0 && !results.prepared
          ? "Measurable results will surface here automatically as Search, Website, and Advertising facts are connected and ingested — never estimated."
          : null,
      ].filter((p): p is string => Boolean(p)),
    },
    {
      id: "ahead",
      title: "The road ahead",
      paragraphs: [
        whatComesNext.length > 0
          ? whatComesNext.join(" ")
          : "Next steps remain open and unhurried — paced to real capacity.",
        platformItem?.platformOpportunity
          ? `${platformItem.platformOpportunity.title} is ${platformItem.platformOpportunity.positioning.toLowerCase()}. It can extend into ${platformItem.platformOpportunity.capabilities
              .slice(0, 3)
              .map((c) => c.charAt(0).toLowerCase() + c.slice(1))
              .join("; ")} — when leadership chooses that expansion.`
          : null,
        platformItem?.platformOpportunity
          ? platformItem.platformOpportunity.pricing.note
          : null,
      ].filter((p): p is string => Boolean(p)),
    },
  ];

  return {
    clientId: input.clientId ?? null,
    clientSlug: lens.clientSlug,
    clientName,
    available: true,
    opening: {
      eyebrow: "Executive Client Briefing",
      headline: `The ${clientName} partnership`,
      perspective:
        relationship?.statement ??
        identity?.statement ??
        `A calm executive view of the ${clientName} relationship with Kreate by Design.`,
    },
    relationshipAtAGlance: {
      phase,
      focus:
        currentWork[0]?.label ??
        awaitingClient[0]?.label ??
        "Partnership clarity",
      nextMilestone: launch ? lineFor(launch) : "Continue measured progress",
      health: "Steady and focused",
    },
    chapters,
    built,
    systems,
    marketing,
    currentWork,
    awaitingClient,
    results,
    whatComesNext,
    platformOpportunity: platformItem?.platformOpportunity ?? null,
    recommendedNextSteps: recommendedNextSteps.slice(0, 4),
    composedAt: new Date().toISOString(),
  };
}
