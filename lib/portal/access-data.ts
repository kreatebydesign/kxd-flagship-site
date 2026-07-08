import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  evaluatePortalClientReadiness,
  isPrimalProductionCandidate,
  isResendConfigured,
  type CesProfileStatus,
  type PortalReadinessIssue,
} from "./readiness";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function resolveId(rel: AnyDoc | number | null | undefined): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  return Number((rel as AnyDoc).id) || null;
}

function resolveName(rel: AnyDoc | number | null | undefined, fallback = "—"): string {
  if (!rel) return fallback;
  if (typeof rel === "object") return String((rel as AnyDoc).name ?? fallback);
  return `#${rel}`;
}

function normalizeCesProfileStatus(value: unknown): CesProfileStatus {
  if (value === "active" || value === "draft" || value === "archived") return value;
  return "none";
}

export interface PortalAccessUserRow {
  id: number;
  email: string;
  displayName: string | null;
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  active: boolean;
  welcomeCompleted: boolean;
  createdAt: string;
  payloadAdminUrl: string;
}

export interface PortalAccessClientReadiness {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  portalUserCount: number;
  activePortalUserCount: number;
  hasActiveCesProfile: boolean;
  cesProfileStatus: CesProfileStatus;
  cesProfileName: string | null;
  cesModules: string[];
  accentColor: string | null;
  websiteUrl: string | null;
  ready: boolean;
  isProductionCandidate: boolean;
  issues: PortalReadinessIssue[];
  payloadClientUrl: string;
  payloadCesProfileUrl: string | null;
}

export interface PortalAccessData {
  users: PortalAccessUserRow[];
  clients: PortalAccessClientReadiness[];
  resendConfigured: boolean;
  resendWarning: string | null;
}

export async function getPortalAccessData(): Promise<PortalAccessData> {
  const payload = await getPayload({ config });
  const isProduction = process.env.NODE_ENV === "production";
  const resendConfigured = isResendConfigured();

  const [usersResult, clientsResult, profilesResult] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      sort: "email",
      limit: 200,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: "clients",
      sort: "name",
      limit: 200,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-experience-profiles" as any,
      limit: 200,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const profileByClient = new Map<number, AnyDoc>();
  for (const doc of profilesResult.docs as AnyDoc[]) {
    const clientId = resolveId(doc.client);
    if (clientId != null) profileByClient.set(clientId, doc);
  }

  const userCounts = new Map<number, { total: number; active: number }>();
  const users: PortalAccessUserRow[] = (usersResult.docs as AnyDoc[]).map((doc) => {
    const id = doc.id as number;
    const clientId = resolveId(doc.client) ?? 0;
    const clientRaw = doc.client;
    const clientName = resolveName(clientRaw);
    const clientSlug =
      typeof clientRaw === "object" && clientRaw !== null && "slug" in clientRaw
        ? String((clientRaw as AnyDoc).slug ?? "") || null
        : null;
    const active = doc.active !== false;

    const counts = userCounts.get(clientId) ?? { total: 0, active: 0 };
    counts.total += 1;
    if (active) counts.active += 1;
    userCounts.set(clientId, counts);

    return {
      id,
      email: String(doc.email ?? ""),
      displayName: doc.displayName ? String(doc.displayName) : null,
      clientId,
      clientName,
      clientSlug,
      active,
      welcomeCompleted: Boolean(doc.welcomeCompletedAt),
      createdAt: String(doc.createdAt ?? ""),
      payloadAdminUrl: `/admin/collections/portal-users/${id}`,
    };
  });

  const readinessEnv = { resendConfigured, isProduction };

  const clients: PortalAccessClientReadiness[] = (clientsResult.docs as AnyDoc[]).map((doc) => {
    const clientId = doc.id as number;
    const profile = profileByClient.get(clientId);
    const counts = userCounts.get(clientId) ?? { total: 0, active: 0 };
    const cesProfileStatus = profile ? normalizeCesProfileStatus(profile.status) : "none";
    const modules = Array.isArray(profile?.enabledModules)
      ? (profile.enabledModules as string[])
      : [];

    const input = {
      clientId,
      clientName: String(doc.name ?? "Client"),
      clientSlug: doc.slug ? String(doc.slug) : null,
      websiteUrl: doc.companyWebsite ? String(doc.companyWebsite) : null,
      portalUserCount: counts.total,
      activePortalUserCount: counts.active,
      cesProfileStatus,
      cesProfileName: profile ? String(profile.profileName ?? "") : null,
      cesModules: modules,
      accentColor: profile?.accentColor ? String(profile.accentColor) : null,
    };

    const evaluation = evaluatePortalClientReadiness(input, readinessEnv);

    return {
      ...input,
      hasActiveCesProfile: cesProfileStatus === "active",
      ready: evaluation.ready,
      isProductionCandidate: isPrimalProductionCandidate(input.clientSlug),
      issues: evaluation.issues,
      payloadClientUrl: `/admin/collections/clients/${clientId}`,
      payloadCesProfileUrl: profile ? `/admin/collections/client-experience-profiles/${profile.id}` : null,
    };
  });

  const resendWarning =
    isProduction && !resendConfigured
      ? "RESEND_API_KEY is not configured. Portal password reset emails will not send until Resend is set up."
      : null;

  return { users, clients, resendConfigured, resendWarning };
}
