/**
 * /admin/operations/timeline
 * KXD Core Phase 5D — Executive Timeline dashboard
 */

import { ExecutiveTimelineScreen } from "@/components/admin/operations/timeline/ExecutiveTimelineScreen";
import { getExecutiveTimelineDashboard } from "@/lib/executive-timeline/data";
import type {
  ExecutiveTimelineCategory,
  ExecutiveTimelineImportance,
} from "@/lib/executive-timeline/types";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set<ExecutiveTimelineCategory | "all">([
  "all",
  "relationship",
  "project",
  "creative",
  "infrastructure",
  "website",
  "seo",
  "analytics",
  "marketing",
  "finance",
  "onboarding",
  "meeting",
  "communication",
  "support",
  "launch",
  "growth",
  "system",
]);

const VALID_IMPORTANCE = new Set<ExecutiveTimelineImportance | "all">([
  "all",
  "low",
  "normal",
  "high",
  "critical",
]);

type Props = {
  searchParams: Promise<{
    client?: string;
    category?: string;
    importance?: string;
    q?: string;
    pinned?: string;
  }>;
};

export default async function ExecutiveTimelinePage({ searchParams }: Props) {
  const params = await searchParams;

  const categoryFilter: ExecutiveTimelineCategory | "all" =
    params.category && VALID_CATEGORIES.has(params.category as ExecutiveTimelineCategory | "all")
      ? (params.category as ExecutiveTimelineCategory | "all")
      : "all";

  const importanceFilter: ExecutiveTimelineImportance | "all" =
    params.importance &&
    VALID_IMPORTANCE.has(params.importance as ExecutiveTimelineImportance | "all")
      ? (params.importance as ExecutiveTimelineImportance | "all")
      : "all";

  const clientFilter = params.client ? Number(params.client) : undefined;
  const searchQuery = params.q?.trim() ?? "";
  const pinnedOnly = params.pinned === "1";

  const data = await getExecutiveTimelineDashboard({
    clientId: clientFilter && !Number.isNaN(clientFilter) ? clientFilter : undefined,
    category: categoryFilter,
    importance: importanceFilter,
    search: searchQuery || undefined,
    pinnedOnly,
  });

  return (
    <ExecutiveTimelineScreen
      data={data}
      categoryFilter={categoryFilter}
      importanceFilter={importanceFilter}
      clientFilter={clientFilter && !Number.isNaN(clientFilter) ? clientFilter : undefined}
      searchQuery={searchQuery}
      pinnedOnly={pinnedOnly}
    />
  );
}
