import "server-only";

/**
 * Phase 23A — compose Executive Context from existing cached services.
 * Does not reason. Does not invent. Deterministic shaping only.
 */

import { getRecentExecutiveActivity } from "@/lib/activity-engine";
import {
  buildExecutiveSignals,
  EXECUTIVE_SIGNALS_EMPTY_MESSAGE,
} from "@/lib/executive-signals";
import { loadBriefingContext } from "@/lib/intelligence/briefings/builder";
import type { IntelligenceConfidence } from "@/lib/intelligence/types";
import { resolveContinuation } from "@/lib/operational-flow/resolve-continuation";
import { loadMorningBriefPageData } from "@/lib/rituals/morning-brief";
import { filterWorkByStatus } from "@/lib/work";
import { getWorkPool } from "@/lib/work/engine";
import { EXECUTIVE_CONTEXT_EXTENSIONS } from "./extensions";
import {
  refFromReview,
  refFromSignal,
  refFromWork,
  uniqueClientsFromWork,
} from "./refs";
import { EXECUTIVE_CONTEXT_ACTIVITY_FETCH } from "./select-activity";
import type {
  ExecutiveContext,
  ExecutiveContextInput,
  ExecutiveContextRef,
  ExecutiveMomentumSlice,
} from "./types";

const FOCUS_LIMIT = 4;
const ACTIVITY_LIMIT = 6;

function momentumFromTone(tone: string): ExecutiveMomentumSlice["businessMomentum"] {
  const t = tone.toLowerCase();
  if (t.includes("calm") || t.includes("clear") || t.includes("quiet")) return "quiet";
  if (t.includes("pressur") || t.includes("strain") || t.includes("urgent")) return "pressured";
  if (t.includes("alert") || t.includes("elevat") || t.includes("busy") || t.includes("active")) {
    return "elevated";
  }
  return "steady";
}

function priorityFromEngine(
  morning: Awaited<ReturnType<typeof loadMorningBriefPageData>>,
  todayWork: ReturnType<typeof refFromWork>[],
): ExecutiveContextRef | null {
  // Phase 28B — carry canonical engine result via firstAction adapter.
  // Do not silently fall back to briefing.primaryRecommendation (legacy ranking).
  const { firstAction } = morning;

  if (firstAction.hasAction) {
    return {
      id: `priority-engine-first-action`,
      kind:
        firstAction.kind.includes("website-review")
          ? "review"
          : firstAction.kind === "work"
            ? "work"
            : "activity",
      title: firstAction.label,
      detail:
        [firstAction.clientName, firstAction.itemTitle, firstAction.detail]
          .filter(Boolean)
          .join(" · ") || null,
      href: firstAction.href,
      clientName: firstAction.clientName,
    };
  }

  return todayWork[0] ?? null;
}

function continuationFromWork(
  inProgress: ReturnType<typeof refFromWork>[],
  todayWork: ReturnType<typeof refFromWork>[],
  priority: ExecutiveContextRef | null,
): ExecutiveContextRef | null {
  return inProgress[0] ?? todayWork[0] ?? priority;
}

function continuationFromOperationalFlow(
  pool: Awaited<ReturnType<typeof getWorkPool>>,
  fallback: ExecutiveContextRef | null,
): ExecutiveContextRef | null {
  const resolved = resolveContinuation({
    pool,
    kind: "work.status-changed",
  });
  if (!resolved?.workId || !resolved.title) return fallback;
  return {
    id: `work-${resolved.workId}`,
    kind: "work",
    title: resolved.title,
    detail: resolved.reason,
    href: resolved.href,
    clientId: resolved.clientId,
    clientName: resolved.clientName,
    workId: resolved.workId,
  };
}

/**
 * Load once — Morning Brief warms briefing context; activity is the only companion fetch.
 */
export async function composeExecutiveContext(
  input: ExecutiveContextInput = {},
): Promise<ExecutiveContext> {
  const [morning, recentActivity] = await Promise.all([
    loadMorningBriefPageData(input),
    getRecentExecutiveActivity({ limit: EXECUTIVE_CONTEXT_ACTIVITY_FETCH }),
  ]);

  const briefingContext = await loadBriefingContext();
  const work = briefingContext.work;
  const todayWork = work.todayWork.slice(0, FOCUS_LIMIT);
  const todayRefs = todayWork.map(refFromWork);

  const waitingOnClient = work.waitingOnClient.slice(0, 8).map(refFromWork);
  const waitingOnKxd = work.waitingOnKxd.slice(0, 8).map(refFromWork);
  const blocked = filterWorkByStatus(work.currentWork, "blocked").slice(0, 8).map(refFromWork);
  const inProgress = filterWorkByStatus(work.currentWork, "in-progress")
    .slice(0, 6)
    .map(refFromWork);

  const reviewItems = (briefingContext.reviewInbox?.items ?? [])
    .filter(
      (item) =>
        item.status === "new" ||
        item.status === "triaged" ||
        item.status === "in-progress" ||
        item.status === "waiting-on-client",
    )
    .slice(0, 6);
  const reviewsWaiting = reviewItems.map(refFromReview);

  const signalsResult = buildExecutiveSignals(recentActivity, ACTIVITY_LIMIT);
  const executiveSignals = signalsResult.signals;
  const whatChanged = executiveSignals.map(refFromSignal);

  /* Backward-compat Activity slice — first underlying item per signal. */
  const activityById = new Map(recentActivity.map((a) => [a.id, a]));
  const meaningfulActivity = executiveSignals
    .map((s) => activityById.get(s.sourceActivityIds[0]))
    .filter((a): a is NonNullable<typeof a> => a != null);

  const recommendedPriority = priorityFromEngine(morning, todayRefs);
  const legacyContinuation = continuationFromWork(
    inProgress,
    todayRefs,
    recommendedPriority,
  );
  const pool = await getWorkPool();
  const recommendedContinuation = continuationFromOperationalFlow(
    pool,
    legacyContinuation,
  );

  const intel = morning.intelligence;
  const headline =
    intel.sections[0]?.paragraphs[0] ?? intel.contextSummary ?? intel.postureLabel;
  const businessMomentum = momentumFromTone(intel.tone);
  const quietHoursReady =
    !morning.firstAction.hasAction &&
    blocked.length === 0 &&
    (work.stats?.overdueCount ?? 0) === 0;

  const confidence: IntelligenceConfidence = morning.briefing.confidence ?? "medium";

  const activeClients = uniqueClientsFromWork([
    ...todayWork,
    ...work.waitingOnClient.slice(0, 5),
    ...work.waitingOnKxd.slice(0, 5),
  ]).slice(0, 8);

  const waitingItems = [...waitingOnClient, ...waitingOnKxd, ...reviewsWaiting];

  const lastActivitySeen = whatChanged[0] ?? null;
  const recentClient =
    activeClients[0] ??
    (recommendedPriority?.clientId != null
      ? {
          id: `client-${recommendedPriority.clientId}`,
          kind: "client" as const,
          title: recommendedPriority.clientName || "Client",
          detail: null,
          href: `/admin/operations/client-success/${recommendedPriority.clientId}`,
          clientId: recommendedPriority.clientId,
          clientName: recommendedPriority.clientName,
        }
      : null);

  const focus = {
    items: todayRefs,
    recommendedPriority,
  };

  const continuation = {
    recommendedContinuation,
    unfinishedWork: inProgress,
    lastViewedWork: inProgress[0] ?? todayRefs[0] ?? null,
    recentClient,
  };

  const attention = {
    items: whatChanged.slice(0, 6),
    whatChanged,
  };

  const waiting = {
    waitingOnClient,
    waitingOnKxd,
    blockedItems: blocked,
    reviewsWaiting,
  };

  const momentum = {
    postureLabel: intel.postureLabel,
    tone: intel.tone,
    businessMomentum,
    quietHoursReady,
  };

  const summary = {
    greeting: morning.voice.greeting,
    welcome: morning.voice.welcome,
    dateDisplay: morning.briefing.dateDisplay,
    timeDisplay: morning.briefing.timeDisplay,
    headline,
    contextSummary: intel.contextSummary || intel.readingTexts[0] || intel.postureLabel,
    confidence,
  };

  const history = {
    recentActivity: meaningfulActivity,
    recentWorkspaceHints: ["today", "work", "operations"],
    unfinishedTraining: null,
    lastActivitySeen,
  };

  return {
    generatedAt: new Date().toISOString(),
    currentFocus: focus,
    recommendedContinuation,
    waitingItems,
    blockedItems: blocked,
    activeClients,
    todayWork,
    reviewsWaiting,
    trainingStatus: {
      available: false,
      pathSlug: null,
      lessonSlug: null,
      note: "Training progress plugs into Context when a learner session is present.",
    },
    businessMomentum,
    recommendedPriority,
    quietHoursReady,
    confidence,
    focus,
    continuation,
    attention,
    waiting,
    momentum,
    summary,
    history,
    morning,
    meaningfulActivity,
    executiveSignals,
    signalsEmptyMessage: signalsResult.emptyMessage || EXECUTIVE_SIGNALS_EMPTY_MESSAGE,
    extensions: EXECUTIVE_CONTEXT_EXTENSIONS,
  };
}
