import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { BUILTIN_PLAYBOOK_TEMPLATES } from "./templates";
import { parseIdArray } from "./progress";
import type {
  ClientPlaybookSummary,
  PlaybookDashboardData,
  PlaybookDoc,
  PlaybookListItem,
  PlaybookOperationsSnapshot,
  PlaybookRunDetail,
  PlaybookRunListItem,
  PlaybookRunStepView,
} from "./types";

const PLAYBOOKS = "playbooks";
const STEPS = "playbook-steps";
const RUNS = "playbook-runs";

let seeded = false;

export async function ensurePlaybooksSeeded(): Promise<void> {
  if (seeded) return;
  const payload = await getPayload({ config });

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PLAYBOOKS as any,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.totalDocs > 0) {
    seeded = true;
    return;
  }

  for (const template of BUILTIN_PLAYBOOK_TEMPLATES) {
    const playbook = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: PLAYBOOKS as any,
      data: {
        name: template.name,
        slug: template.slug,
        description: template.description,
        category: template.category,
        icon: template.icon,
        color: template.color,
        estimatedDuration: template.estimatedDuration,
        active: true,
        version: "1.0",
        appliesTo: template.appliesTo,
        tags: template.tags?.map((tag) => ({ tag })),
      },
      overrideAccess: true,
    });

    for (const step of template.steps) {
      await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: STEPS as any,
        data: {
          playbook: playbook.id,
          order: step.order,
          title: step.title,
          description: step.description,
          instructions: step.instructions,
          required: step.required ?? true,
          estimatedMinutes: step.estimatedMinutes,
          linkedModule: step.linkedModule,
          automationTrigger: step.automationTrigger ?? "none",
        },
        overrideAccess: true,
      });
    }
  }

  seeded = true;
}

function toPlaybookListItem(doc: PlaybookDoc, stepCount: number): PlaybookListItem {
  return {
    id: doc.id as number,
    slug: String(doc.slug),
    name: String(doc.name),
    description: String(doc.description ?? ""),
    category: doc.category as PlaybookListItem["category"],
    icon: String(doc.icon ?? "PB"),
    estimatedDuration: String(doc.estimatedDuration ?? "—"),
    stepCount,
    active: Boolean(doc.active),
    href: `/admin/operations/playbooks?playbook=${doc.slug}`,
    launchHref: `/admin/operations/playbooks?playbook=${doc.slug}`,
  };
}

function toRunListItem(run: PlaybookDoc): PlaybookRunListItem {
  const playbook = run.playbook as PlaybookDoc | number;
  const client = run.client as PlaybookDoc | number;
  const currentStep = run.currentStep as PlaybookDoc | number | null | undefined;
  const currentStepTitle =
    currentStep && typeof currentStep === "object" ? String(currentStep.title ?? "") : undefined;

  return {
    id: run.id as number,
    playbookId: typeof playbook === "object" ? (playbook.id as number) : Number(playbook),
    playbookName: typeof playbook === "object" ? String(playbook.name) : "Playbook",
    playbookSlug: typeof playbook === "object" ? String(playbook.slug) : "",
    clientId: typeof client === "object" ? (client.id as number) : Number(client),
    clientName: typeof client === "object" ? String(client.name) : "Client",
    status: run.status as PlaybookRunListItem["status"],
    percentComplete: Number(run.percentComplete ?? 0),
    currentStepTitle,
    startedAt: run.startedAt ? String(run.startedAt) : null,
    completedAt: run.completedAt ? String(run.completedAt) : null,
    href: `/admin/operations/playbooks/runs/${run.id}`,
  };
}

export async function getPlaybookDashboard(): Promise<PlaybookDashboardData> {
  await ensurePlaybooksSeeded();
  const payload = await getPayload({ config });

  const [playbooksR, runsR] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: PLAYBOOKS as any,
      limit: 100,
      sort: "name",
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: RUNS as any,
      limit: 80,
      sort: "-updatedAt",
      depth: 2,
      overrideAccess: true,
    }),
  ]);

  const playbooks = playbooksR.docs as PlaybookDoc[];
  const runs = runsR.docs as PlaybookDoc[];

  const stepCounts = new Map<number, number>();
  if (playbooks.length) {
    const stepsR = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: STEPS as any,
      limit: 500,
      depth: 0,
      overrideAccess: true,
    });
    for (const step of stepsR.docs as PlaybookDoc[]) {
      const pb = typeof step.playbook === "object" ? (step.playbook as PlaybookDoc).id : step.playbook;
      stepCounts.set(Number(pb), (stepCounts.get(Number(pb)) ?? 0) + 1);
    }
  }

  const playbookItems = playbooks.map((p) =>
    toPlaybookListItem(p, stepCounts.get(p.id as number) ?? 0),
  );

  const byCategory: Record<string, PlaybookListItem[]> = {};
  for (const item of playbookItems) {
    const key = item.category;
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(item);
  }

  const activeRuns: PlaybookRunListItem[] = [];
  const completedRuns: PlaybookRunListItem[] = [];
  const blockedRuns: PlaybookRunListItem[] = [];

  for (const run of runs) {
    const item = toRunListItem(run);
    const st = String(run.status);
    if (st === "completed" || st === "archived") completedRuns.push(item);
    else if (st === "blocked") blockedRuns.push(item);
    else activeRuns.push(item);
  }

  return {
    playbooks: playbookItems,
    activeRuns,
    completedRuns: completedRuns.slice(0, 20),
    blockedRuns,
    byCategory,
    stats: {
      templateCount: playbookItems.length,
      activeRunCount: activeRuns.length,
      completedRunCount: completedRuns.length,
      blockedRunCount: blockedRuns.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getPlaybookRunDetail(runId: number): Promise<PlaybookRunDetail | null> {
  await ensurePlaybooksSeeded();
  const payload = await getPayload({ config });

  try {
    const run = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: RUNS as any,
      id: runId,
      depth: 1,
      overrideAccess: true,
    })) as PlaybookDoc;

    const playbook = run.playbook as PlaybookDoc;
    const client = run.client as PlaybookDoc;
    const playbookId = playbook.id as number;

    const stepsR = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: STEPS as any,
      where: { playbook: { equals: playbookId } },
      limit: 100,
      sort: "order",
      depth: 0,
      overrideAccess: true,
    });

    const completed = parseIdArray(run.completedSteps);
    const skipped = parseIdArray(run.skippedSteps);
    const currentStepId =
      typeof run.currentStep === "object"
        ? (run.currentStep as PlaybookDoc).id
        : run.currentStep;

    const steps: PlaybookRunStepView[] = (stepsR.docs as PlaybookDoc[]).map((step) => {
      const id = step.id as number;
      let state: PlaybookRunStepView["state"] = "pending";
      if (completed.includes(id)) state = "completed";
      else if (skipped.includes(id)) state = "skipped";
      else if (currentStepId === id) state = "current";

      return {
        id,
        order: Number(step.order),
        title: String(step.title),
        description: step.description ? String(step.description) : undefined,
        instructions: step.instructions ? String(step.instructions) : undefined,
        required: Boolean(step.required),
        estimatedMinutes: step.estimatedMinutes ? Number(step.estimatedMinutes) : undefined,
        linkedModule: step.linkedModule ? String(step.linkedModule) : undefined,
        automationTrigger: step.automationTrigger ? String(step.automationTrigger) : undefined,
        state,
      };
    });

    return {
      id: runId,
      playbookId,
      playbookName: String(playbook.name),
      playbookSlug: String(playbook.slug),
      clientId: client.id as number,
      clientName: String(client.name),
      projectId:
        run.project
          ? typeof run.project === "object"
            ? (run.project as PlaybookDoc).id
            : Number(run.project)
          : null,
      status: run.status as PlaybookRunDetail["status"],
      percentComplete: Number(run.percentComplete ?? 0),
      startedAt: run.startedAt ? String(run.startedAt) : null,
      completedAt: run.completedAt ? String(run.completedAt) : null,
      durationMinutes: run.durationMinutes ? Number(run.durationMinutes) : null,
      steps,
      currentStepId: currentStepId ? Number(currentStepId) : null,
    };
  } catch {
    return null;
  }
}

export async function getClientPlaybookSummary(clientId: number): Promise<ClientPlaybookSummary> {
  await ensurePlaybooksSeeded();
  const payload = await getPayload({ config });

  const runsR = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: RUNS as any,
    where: { client: { equals: clientId } },
    limit: 30,
    sort: "-updatedAt",
    depth: 1,
    overrideAccess: true,
  });

  const active: PlaybookRunListItem[] = [];
  const completed: PlaybookRunListItem[] = [];
  let nextStep: ClientPlaybookSummary["nextStep"] = null;

  for (const run of runsR.docs as PlaybookDoc[]) {
    const item = toRunListItem(run);
    const st = String(run.status);
    if (st === "completed" || st === "archived") completed.push(item);
    else {
      active.push(item);
      if (!nextStep && st === "in-progress" && item.currentStepTitle) {
        nextStep = { runId: item.id, stepTitle: item.currentStepTitle, href: item.href };
      }
    }
  }

  if (!nextStep && active.length > 0) {
    const detail = await getPlaybookRunDetail(active[0].id);
    const current = detail?.steps.find((s) => s.state === "current");
    if (current) {
      nextStep = { runId: active[0].id, stepTitle: current.title, href: active[0].href };
    }
  }

  return { active, completed: completed.slice(0, 8), nextStep };
}

export async function getPlaybookOperationsSnapshot(): Promise<PlaybookOperationsSnapshot> {
  await ensurePlaybooksSeeded();
  const dash = await getPlaybookDashboard();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const completedThisMonth = dash.completedRuns.filter((r) => {
    if (!r.completedAt) return false;
    return new Date(r.completedAt) >= monthStart;
  }).length;

  const totalRuns = dash.stats.activeRunCount + dash.stats.completedRunCount + dash.stats.blockedRunCount;
  const completionRate =
    totalRuns > 0 ? Math.round((dash.stats.completedRunCount / totalRuns) * 100) : 0;

  const bottleneckMap = new Map<string, { name: string; blockedCount: number }>();
  for (const run of dash.blockedRuns) {
    const key = run.playbookSlug;
    const entry = bottleneckMap.get(key) ?? { name: run.playbookName, blockedCount: 0 };
    entry.blockedCount += 1;
    bottleneckMap.set(key, entry);
  }

  return {
    activeCount: dash.stats.activeRunCount,
    blockedCount: dash.stats.blockedRunCount,
    completedThisMonth,
    completionRate,
    bottleneckPlaybooks: [...bottleneckMap.entries()].map(([slug, v]) => ({
      slug,
      name: v.name,
      blockedCount: v.blockedCount,
    })),
  };
}

export async function getCompletedPlaybooksForClientInMonth(
  clientId: number,
  month: number,
  year: number,
): Promise<PlaybookRunListItem[]> {
  await ensurePlaybooksSeeded();
  const payload = await getPayload({ config });
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const runsR = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: RUNS as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { status: { equals: "completed" } },
        { completedAt: { greater_than_equal: start.toISOString() } },
        { completedAt: { less_than_equal: end.toISOString() } },
      ],
    },
    limit: 20,
    depth: 1,
    overrideAccess: true,
  });

  return (runsR.docs as PlaybookDoc[]).map((r) => toRunListItem(r));
}
