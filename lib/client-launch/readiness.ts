/**
 * Client Launch Readiness — evaluation and data loading.
 * Payload-safe (no server-only) for CLI scripts, hooks, and admin routes.
 */

import type { Payload } from "payload";
import {
  buildLaunchChecklist,
  requiredChecklistComplete,
} from "./checklist";
import type {
  ClientLaunchReadiness,
  ClientLaunchReadinessInput,
  ClientLaunchOverallStatus,
  LaunchReadinessEnv,
} from "./types";
import {
  collectLaunchBlockers,
  hasLaunchBlockers,
  normalizeCesProfileStatus,
} from "./validators";

const WEBSITE_REVIEW_MODULE = "website-review";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function defaultLaunchReadinessEnv(
  overrides?: Partial<LaunchReadinessEnv>,
): LaunchReadinessEnv {
  return {
    resendConfigured: isResendConfigured(),
    isProduction: process.env.NODE_ENV === "production",
    ...overrides,
  };
}

function websiteReviewEnabled(input: ClientLaunchReadinessInput): boolean {
  return (
    input.cesProfileStatus === "active" &&
    input.cesModules.includes(WEBSITE_REVIEW_MODULE)
  );
}

function deriveReadinessFlags(input: ClientLaunchReadinessInput): Pick<
  ClientLaunchReadiness,
  | "workspaceReady"
  | "portalReady"
  | "usersReady"
  | "modulesReady"
  | "welcomeReady"
  | "reviewReady"
> {
  const workspaceReady =
    Boolean(input.clientName?.trim()) &&
    input.cesProfileStatus === "active" &&
    (!input.clientStatus || input.clientStatus === "active");

  const modulesReady =
    input.cesProfileStatus === "active" && input.cesModules.length > 0;

  const portalReady = workspaceReady && modulesReady;

  const usersReady = input.activePortalUserCount > 0;

  const welcomeReady =
    input.activePortalUserCount === 0
      ? false
      : input.welcomePendingUserCount === 0;

  const reviewReady = websiteReviewEnabled(input)
    ? Boolean(input.websiteUrl?.trim())
    : true;

  return {
    workspaceReady,
    portalReady,
    usersReady,
    modulesReady,
    welcomeReady,
    reviewReady,
  };
}

function deriveOverallStatus(
  blockers: ClientLaunchReadiness["blockers"],
  flags: ReturnType<typeof deriveReadinessFlags>,
  checklist: ClientLaunchReadiness["checklist"],
): ClientLaunchOverallStatus {
  if (hasLaunchBlockers(blockers, "blocker")) {
    return "not_ready";
  }

  const requiredComplete = requiredChecklistComplete(checklist);
  const coreReady =
    flags.workspaceReady &&
    flags.modulesReady &&
    flags.usersReady &&
    flags.reviewReady;

  if (requiredComplete && coreReady) {
    return "ready";
  }

  return "in_progress";
}

export function evaluateClientLaunchReadiness(
  input: ClientLaunchReadinessInput,
  env: LaunchReadinessEnv,
): ClientLaunchReadiness {
  const flags = deriveReadinessFlags(input);
  const blockers = collectLaunchBlockers(input, env);

  if (
    flags.workspaceReady &&
    flags.modulesReady &&
    flags.reviewReady &&
    !hasLaunchBlockers(blockers, "blocker")
  ) {
    blockers.push({
      id: "launch-core-configured",
      level: "info",
      message: flags.usersReady
        ? "Core workspace is configured — client can collaborate when portal users are active."
        : "Core workspace is configured — create portal users to complete go-live.",
      checklistStepId: "client-ready",
    });
  }

  const partial: Pick<
    ClientLaunchReadiness,
    | "workspaceReady"
    | "portalReady"
    | "usersReady"
    | "modulesReady"
    | "welcomeReady"
    | "reviewReady"
    | "overallStatus"
  > = {
    ...flags,
    overallStatus: "in_progress",
  };

  const checklist = buildLaunchChecklist(partial);
  const overallStatus = deriveOverallStatus(blockers, flags, checklist);

  return {
    clientId: input.clientId,
    clientName: input.clientName,
    clientSlug: input.clientSlug,
    ...flags,
    overallStatus,
    blockers,
    checklist: buildLaunchChecklist({ ...flags, overallStatus }),
    portalUserCount: input.portalUserCount,
    activePortalUserCount: input.activePortalUserCount,
    welcomePendingUserCount: input.welcomePendingUserCount,
    cesProfileStatus: input.cesProfileStatus,
    cesProfileName: input.cesProfileName,
    enabledModules: [...input.cesModules],
    websiteUrl: input.websiteUrl,
  };
}

function resolveClientId(rel: unknown): number | null {
  if (typeof rel === "number") return rel;
  if (rel && typeof rel === "object" && "id" in rel) {
    return Number((rel as { id?: number }).id) || null;
  }
  return null;
}

export async function loadClientLaunchReadinessInput(
  payload: Payload,
  clientId: number,
): Promise<ClientLaunchReadinessInput | null> {
  let client: AnyDoc;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return null;
  }

  const [profiles, portalUsers] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-experience-profiles" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      where: { client: { equals: clientId } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const profile = profiles.docs[0] as AnyDoc | undefined;
  const users = portalUsers.docs as AnyDoc[];
  const activeUsers = users.filter((user) => user.active !== false);
  const welcomeCompleted = activeUsers.filter((user) => Boolean(user.welcomeCompletedAt));

  return {
    clientId,
    clientName: String(client.name ?? "Client"),
    clientSlug: client.slug ? String(client.slug) : null,
    clientStatus: client.status ? String(client.status) : null,
    websiteUrl: client.companyWebsite ? String(client.companyWebsite) : null,
    portalUserCount: users.length,
    activePortalUserCount: activeUsers.length,
    welcomeCompletedUserCount: welcomeCompleted.length,
    welcomePendingUserCount: activeUsers.length - welcomeCompleted.length,
    cesProfileStatus: profile
      ? normalizeCesProfileStatus(profile.status)
      : "none",
    cesProfileName: profile ? String(profile.profileName ?? "") : null,
    cesModules: Array.isArray(profile?.enabledModules)
      ? (profile.enabledModules as string[])
      : [],
    accentColor: profile?.accentColor ? String(profile.accentColor) : null,
  };
}

export async function loadClientLaunchReadinessBySlug(
  payload: Payload,
  clientSlug: string,
  env?: Partial<LaunchReadinessEnv>,
): Promise<ClientLaunchReadiness | null> {
  const clients = await payload.find({
    collection: "clients",
    where: { slug: { equals: clientSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (clients.docs.length === 0) return null;

  const clientId = clients.docs[0].id as number;
  return loadClientLaunchReadiness(payload, clientId, env);
}

export async function loadClientLaunchReadiness(
  payload: Payload,
  clientId: number,
  env?: Partial<LaunchReadinessEnv>,
): Promise<ClientLaunchReadiness | null> {
  const input = await loadClientLaunchReadinessInput(payload, clientId);
  if (!input) return null;
  return evaluateClientLaunchReadiness(input, defaultLaunchReadinessEnv(env));
}

export function mapPortalInputToLaunchInput(
  input: {
    clientId: number;
    clientName: string;
    clientSlug: string | null;
    websiteUrl: string | null;
    portalUserCount: number;
    activePortalUserCount: number;
    cesProfileStatus: ClientLaunchReadinessInput["cesProfileStatus"];
    cesProfileName: string | null;
    cesModules: string[];
    accentColor: string | null;
  },
  welcomePendingUserCount = 0,
): ClientLaunchReadinessInput {
  return {
    ...input,
    clientStatus: "active",
    welcomeCompletedUserCount: Math.max(
      0,
      input.activePortalUserCount - welcomePendingUserCount,
    ),
    welcomePendingUserCount,
  };
}

export function isClientLaunchReady(readiness: ClientLaunchReadiness): boolean {
  return readiness.overallStatus === "ready";
}

export function isClientLaunchCoreReady(readiness: ClientLaunchReadiness): boolean {
  return !hasLaunchBlockers(readiness.blockers, "blocker");
}

export type { ClientLaunchOverallStatus };
