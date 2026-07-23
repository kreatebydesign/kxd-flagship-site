import "server-only";

import type { PortalSession } from "@/lib/portal/session";
import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import type { ReviewSession } from "@/lib/ces/review";
import { getWebsiteWorkspaceSite } from "@/lib/ces/modules/website-workspace/catalog";
import { getWebsiteReviewById } from "./data";
import { resolveWebsiteReviewTargetUrl } from "./target-url";

export interface ReviewSessionBootstrap extends ReviewSession {
  parentRequestTitle?: string | null;
  /** Client-scoped Website Workspace pages when configured for this client */
  workspacePages: Array<{ title: string; path: string }>;
}

export async function getReviewSessionBootstrap(
  session: PortalSession,
  profile: ResolvedExperienceProfile,
  revisionId: string,
): Promise<ReviewSessionBootstrap | null> {
  const websiteUrl = await resolveWebsiteReviewTargetUrl(session.clientId);
  if (!websiteUrl) return null;

  const isNew = revisionId === "new";
  let iframeUrl = websiteUrl;
  let parentRequestTitle: string | null = null;

  if (!isNew) {
    const parent = await getWebsiteReviewById(session, revisionId);
    if (!parent) return null;
    parentRequestTitle = parent.title;
    iframeUrl =
      parent.reviewContext?.pageUrl?.trim() ||
      (parent.reviewContext?.pagePath
        ? `${websiteUrl.replace(/\/$/, "")}${parent.reviewContext.pagePath.startsWith("/") ? "" : "/"}${parent.reviewContext.pagePath}`
        : websiteUrl);
  }

  const site = getWebsiteWorkspaceSite(profile.identity.clientSlug);
  const workspacePages =
    site?.pages.map((page) => ({
      title: page.title,
      path: page.path,
    })) ?? [];

  return {
    id: isNew ? `new-${session.clientId}` : revisionId,
    revisionId: isNew ? null : revisionId,
    websiteUrl,
    iframeUrl,
    mode: "browse",
    clientId: session.clientId,
    clientName: session.clientName,
    parentRequestTitle,
    workspacePages,
  };
}
