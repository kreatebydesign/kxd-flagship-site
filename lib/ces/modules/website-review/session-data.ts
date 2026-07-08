import "server-only";

import type { PortalSession } from "@/lib/portal/session";
import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import type { ReviewSession } from "@/lib/ces/review";
import { getWebsiteReviewById } from "./data";

export interface ReviewSessionBootstrap extends ReviewSession {
  parentRequestTitle?: string | null;
}

export async function getReviewSessionBootstrap(
  session: PortalSession,
  profile: ResolvedExperienceProfile,
  revisionId: string,
): Promise<ReviewSessionBootstrap | null> {
  const websiteUrl = profile.identity.websiteUrl?.trim();
  if (!websiteUrl) return null;

  const isNew = revisionId === "new";
  let iframeUrl = websiteUrl;
  let parentRequestTitle: string | null = null;

  if (!isNew) {
    const parent = await getWebsiteReviewById(session, revisionId);
    if (!parent) return null;
    parentRequestTitle = parent.title;
    iframeUrl = parent.reviewContext?.pageUrl?.trim() || websiteUrl;
  }

  return {
    id: isNew ? `new-${session.clientId}` : revisionId,
    revisionId: isNew ? null : revisionId,
    websiteUrl,
    iframeUrl,
    mode: "browse",
    clientId: session.clientId,
    clientName: session.clientName,
    parentRequestTitle,
  };
}
