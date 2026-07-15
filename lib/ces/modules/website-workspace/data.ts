import "server-only";

import { loadAttachmentsForRequest } from "@/lib/ces/modules/website-review/attachments-server";
import { resolveWebsiteReviewTargetUrl } from "@/lib/ces/modules/website-review/target-url";
import {
  mapRequestStatusToWorkspace,
} from "@/lib/ces/vocabulary/website-workspace";
import { loadWebsiteWorkspaceTimeline } from "./activity";
import {
  formatWorkspaceLastUpdated,
  getWebsiteWorkspacePage,
  getWebsiteWorkspaceSite,
} from "./catalog";
import { WEBSITE_WORKSPACE_MAX_ATTACHMENTS } from "./constants";
import {
  getWebsiteWorkspaceRequestById,
  getWebsiteWorkspaceRequestsForClient,
  isOpenWorkspaceRequestStatus,
  readWorkspaceContext,
} from "./queries";
import { notesPreviewFromDetails } from "./submit";
import { formatWorkspaceSubmitter } from "./presentation";
import type {
  WebsiteWorkspaceLandingData,
  WebsiteWorkspacePageCard,
  WebsiteWorkspaceRequestDetail,
  WebsiteWorkspaceRequestItem,
  WebsiteWorkspaceSectionContent,
} from "./types";

function emptyContent(): WebsiteWorkspaceSectionContent {
  return { heading: "", body: "", cta: "", imageUrl: null, imageAlt: "" };
}

export async function getWebsiteWorkspaceLanding(
  clientId: number,
  clientSlug: string | null,
): Promise<WebsiteWorkspaceLandingData> {
  const site = getWebsiteWorkspaceSite(clientSlug);
  const [docs, websiteUrl] = await Promise.all([
    getWebsiteWorkspaceRequestsForClient(clientId),
    resolveWebsiteReviewTargetUrl(clientId),
  ]);

  const openByPage = new Map<string, number>();
  for (const doc of docs) {
    if (!isOpenWorkspaceRequestStatus(String(doc.status ?? ""))) continue;
    const ctx = readWorkspaceContext(doc);
    if (!ctx) continue;
    openByPage.set(ctx.pageSlug, (openByPage.get(ctx.pageSlug) ?? 0) + 1);
  }

  const pages: WebsiteWorkspacePageCard[] = (site?.pages ?? []).map((page) => ({
    slug: page.slug,
    title: page.title,
    description: page.description,
    path: page.path,
    lastUpdated: formatWorkspaceLastUpdated(page.lastUpdated),
    sectionCount: page.sections.length,
    openRequestCount: openByPage.get(page.slug) ?? 0,
    href: `/portal/website-workspace/${page.slug}`,
  }));

  const recentRequests: WebsiteWorkspaceRequestItem[] = docs.slice(0, 8).map((doc) => {
    const ctx = readWorkspaceContext(doc);
    const status = mapRequestStatusToWorkspace(String(doc.status ?? "new"));
    const notesPreview = notesPreviewFromDetails(String(doc.requestDetails ?? ""));
    return {
      id: doc.id as number,
      title: String(doc.requestTitle ?? "Website update"),
      status,
      pageSlug: ctx?.pageSlug ?? "",
      pageTitle: ctx?.pageTitle ?? "Website",
      sectionId: ctx?.sectionId ?? "",
      sectionTitle: ctx?.sectionTitle ?? "Section",
      submittedAt: String(doc.createdAt ?? new Date().toISOString()),
      submittedBy: formatWorkspaceSubmitter({
        requestedBy: doc.requestedBy ? String(doc.requestedBy) : null,
        notesPreview,
        requestDetails: String(doc.requestDetails ?? ""),
      }),
      notesPreview,
      href: `/portal/website-workspace/requests/${doc.id}`,
    };
  });

  return {
    websiteUrl,
    pages,
    recentRequests,
    openRequestCount: docs.filter((doc) =>
      isOpenWorkspaceRequestStatus(String(doc.status ?? "")),
    ).length,
  };
}

export function getWebsiteWorkspacePageView(
  clientSlug: string | null,
  pageSlug: string,
): ReturnType<typeof getWebsiteWorkspacePage> {
  return getWebsiteWorkspacePage(clientSlug, pageSlug);
}

export async function getWebsiteWorkspaceRequestDetail(
  clientId: number,
  requestId: number,
): Promise<WebsiteWorkspaceRequestDetail | null> {
  const doc = await getWebsiteWorkspaceRequestById(clientId, requestId);
  if (!doc) return null;

  const ctx = readWorkspaceContext(doc);
  const attachments = await loadAttachmentsForRequest(
    requestId,
    WEBSITE_WORKSPACE_MAX_ATTACHMENTS,
  );
  const timeline = await loadWebsiteWorkspaceTimeline(requestId);

  return {
    id: doc.id as number,
    title: String(doc.requestTitle ?? "Website update"),
    status: mapRequestStatusToWorkspace(String(doc.status ?? "new")),
    submittedAt: String(doc.createdAt ?? new Date().toISOString()),
    submittedBy: doc.requestedBy ? String(doc.requestedBy) : null,
    pageTitle: ctx?.pageTitle ?? "Website",
    pageSlug: ctx?.pageSlug ?? "",
    sectionTitle: ctx?.sectionTitle ?? "Section",
    sectionId: ctx?.sectionId ?? "",
    current: ctx?.current ?? emptyContent(),
    requested: ctx?.requested ?? emptyContent(),
    notes: ctx?.notes ?? notesPreviewFromDetails(String(doc.requestDetails ?? "")),
    attachments: attachments.map((item) => ({
      ...item,
      url: `/api/portal/website-workspace/attachments/${item.id}`,
    })),
    timeline,
  };
}
