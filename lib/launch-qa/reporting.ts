import "server-only";

import type { LaunchQaMonthlyActivity } from "./types";

export async function getLaunchQaActivityForMonth(
  clientId: number,
  month: number,
  year: number,
): Promise<LaunchQaMonthlyActivity> {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const payload = await getPayload({ config });

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "website-qa-checks" as any,
      where: {
        and: [
          { client: { equals: clientId } },
          { updatedAt: { greater_than_equal: start.toISOString() } },
          { updatedAt: { less_than_equal: end.toISOString() } },
        ],
      },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    });

    const docs = result.docs as Array<Record<string, unknown>>;
    let sessionsCompleted = 0;
    let blockersResolved = 0;
    let postLaunchCompleted = 0;
    let readinessImprovement = 0;
    const lines: string[] = [];

    for (const doc of docs) {
      const status = String(doc.status ?? "");
      const score = Number(doc.readinessScore ?? 0);
      const blockers = (doc.blockers as Array<{ title: string }>) ?? [];
      const warnings = (doc.warnings as Array<{ title: string }>) ?? [];

      if (status === "approved" || status === "launched") {
        sessionsCompleted += 1;
        lines.push(`· Launch QA completed — ${score}% readiness (${status})`);
      }

      if (blockers.length === 0 && status !== "blocked") {
        blockersResolved += 1;
      }

      if (status === "launched") {
        postLaunchCompleted += 1;
        lines.push("· Post-launch QA checklist verified");
      }

      if (score >= 80) readinessImprovement += 1;
      for (const w of warnings.slice(0, 2)) {
        lines.push(`· QA note — ${w.title}`);
      }
    }

    if (readinessImprovement > 0) {
      lines.push(`· Website readiness improved on ${readinessImprovement} QA review(s)`);
    }

    return {
      sessionsCompleted,
      blockersResolved,
      postLaunchCompleted,
      readinessImprovement,
      lines,
    };
  } catch {
    return {
      sessionsCompleted: 0,
      blockersResolved: 0,
      postLaunchCompleted: 0,
      readinessImprovement: 0,
      lines: [],
    };
  }
}
