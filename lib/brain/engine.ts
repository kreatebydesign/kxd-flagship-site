import "server-only";

import { getAutomationDashboard } from "@/lib/automation/engine";
import { getOverdueReminders } from "@/lib/executive-notes/reminders";
import {
  getFounderInsights,
  getGrowthOpportunities,
  getRecommendations,
  loadIntelligenceContext,
} from "@/lib/intelligence/engine";
import { getReportingDashboard } from "@/lib/reporting/engine";
import { buildBrainSignals } from "./signals";
import { detectBrainPatterns } from "./patterns";
import { buildBrainPredictions } from "./predictions";
import { buildDailyPulse } from "./daily";
import { buildWeeklyPulse } from "./weekly";
import { buildMonthlyPulse } from "./monthly";
import { extractTopOpportunities, mergeGrowthOpportunities } from "./opportunities";
import { extractTopRisks } from "./risk";
import { buildBrainRecommendations } from "./reasoning";
import {
  getSuppressedRecommendationIds,
  loadBrainMemory,
  markRecommendationsShown,
} from "./memory";
import type { BrainSnapshot } from "./types";

let signalCache: { at: number; snapshot: BrainSnapshot } | null = null;
const CACHE_TTL_MS = 60_000;

export async function buildBrain(): Promise<BrainSnapshot> {
  if (signalCache && Date.now() - signalCache.at < CACHE_TTL_MS) {
    return signalCache.snapshot;
  }

  const ctx = await loadIntelligenceContext();

  const [
    founder,
    reporting,
    automation,
    overdueReminders,
    memory,
    recommendations,
    growthOpportunities,
  ] = await Promise.all([
    getFounderInsights(ctx),
    getReportingDashboard().catch(() => null),
    getAutomationDashboard().catch(() => null),
    getOverdueReminders(20),
    loadBrainMemory(150),
    getRecommendations(undefined, ctx),
    getGrowthOpportunities(ctx),
  ]);

  const signals = buildBrainSignals({
    ctx,
    founder,
    reporting,
    automation,
    overdueReminders,
  });

  const growthSignals = mergeGrowthOpportunities(growthOpportunities);
  const allSignals = [...signals, ...growthSignals].sort(
    (a, b) =>
      ({ critical: 0, high: 1, medium: 2, low: 3 }[a.urgency] ?? 9) -
      ({ critical: 0, high: 1, medium: 2, low: 3 }[b.urgency] ?? 9),
  );

  const patterns = detectBrainPatterns(ctx);
  const predictions = buildBrainPredictions({ ctx, founder, reporting });
  const suppressed = getSuppressedRecommendationIds(memory);
  const brainRecommendations = buildBrainRecommendations(
    recommendations,
    allSignals,
    suppressed,
  );

  await markRecommendationsShown(brainRecommendations.slice(0, 8).map((r) => r.id));

  const dailyPulse = buildDailyPulse(founder, allSignals, patterns);
  const weeklyPulse = buildWeeklyPulse(founder, allSignals, patterns);
  const monthlyPulse = buildMonthlyPulse(founder, allSignals, patterns, reporting);

  const snapshot: BrainSnapshot = {
    signals: allSignals,
    patterns,
    predictions,
    dailyPulse,
    weeklyPulse,
    monthlyPulse,
    topRisks: extractTopRisks(allSignals),
    topOpportunities: extractTopOpportunities(allSignals),
    recommendations: brainRecommendations,
    recommendationHistory: memory.slice(0, 20),
    status: {
      lastBuiltAt: new Date().toISOString(),
      signalCount: allSignals.length,
      patternCount: patterns.length,
      predictionCount: predictions.length,
      modulesConnected: [
        "Intelligence",
        "Automation",
        "Timeline",
        "Sales",
        "Reporting",
        "Strategy Vault",
        "Projects",
        "Infrastructure",
        "Audits",
        "Founder Intelligence",
        "Client HQ",
        "Executive Profiles",
      ],
      memoryEvents: memory.length,
      futureLlmReady: true,
    },
  };

  signalCache = { at: Date.now(), snapshot };
  return snapshot;
}

export async function getBrainSnapshot(): Promise<BrainSnapshot> {
  return buildBrain();
}

export function clearBrainCache(): void {
  signalCache = null;
}
