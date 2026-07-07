import "server-only";

import { readFileSync } from "fs";
import { join } from "path";
import type {
  PlatformDashboardData,
  PlatformOwner,
  PlatformPhaseDefinition,
  PlatformSubsystemDefinition,
} from "./types";
import {
  PLATFORM_META,
  PLATFORM_PHASES,
  PLATFORM_PRINCIPLES,
  PLATFORM_SUBSYSTEMS,
} from "./registry";
import { collectPlatformEngineeringHealth } from "./metrics";

function averageCompletion(subsystems: PlatformSubsystemDefinition[]): number {
  if (subsystems.length === 0) return 0;
  const sum = subsystems.reduce((acc, s) => acc + s.completionPercent, 0);
  return Math.round(sum / subsystems.length);
}

function groupByOwner(owner: PlatformOwner): PlatformSubsystemDefinition[] {
  return PLATFORM_SUBSYSTEMS.filter((s) => s.owner === owner).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function resolveVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version ?? PLATFORM_META.version;
  } catch {
    return PLATFORM_META.version;
  }
}

function buildRoadmap(phases: PlatformPhaseDefinition[]) {
  const completed = phases.filter((p) => p.status === "completed");
  const current = phases.find((p) => p.status === "in-progress") ?? null;
  const planned = phases.filter((p) => p.status === "planned");

  return {
    recentlyCompleted: completed.slice(-4).reverse(),
    current,
    planned: planned.slice(0, 6),
  };
}

export async function getPlatformDashboardData(): Promise<PlatformDashboardData> {
  const sharedCore = groupByOwner("shared-core");
  const agencyEdition = groupByOwner("agency-edition");
  const platformOwner = groupByOwner("platform-owner");
  const all = PLATFORM_SUBSYSTEMS;

  const buildDate = new Date().toISOString().slice(0, 10);

  return {
    overview: {
      overallCompletionPercent: averageCompletion(all),
      sharedCorePercent: averageCompletion(sharedCore),
      agencyEditionPercent: averageCompletion(agencyEdition),
      platformLayerPercent: averageCompletion(platformOwner),
      meta: {
        ...PLATFORM_META,
        version: resolveVersion(),
        buildDate,
      },
    },
    subsystems: [...all].sort((a, b) => a.name.localeCompare(b.name)),
    architecture: {
      sharedCore,
      agencyEdition,
      platformOwner,
    },
    phases: PLATFORM_PHASES,
    roadmap: buildRoadmap(PLATFORM_PHASES),
    health: collectPlatformEngineeringHealth(),
    principles: PLATFORM_PRINCIPLES,
  };
}
