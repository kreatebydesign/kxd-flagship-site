import type { ClientWorkspaceData } from "@/lib/executive-client-workspace/fetch-client-workspace";
import type { WorkspaceTabId } from "@/lib/executive-client-workspace/theme";
import {
  MarketingTab,
  NotesTab,
  OpportunitiesTab,
  OverviewTab,
  ProjectsTab,
  RevenueTab,
  RoadmapTab,
  ServicesTab,
  TechnicalTab,
  TimelineTab,
} from "./WorkspaceTabs";

export function WorkspaceTabContent({
  tab,
  data,
}: {
  tab: WorkspaceTabId;
  data: ClientWorkspaceData;
}) {
  switch (tab) {
    case "overview":
      return <OverviewTab data={data} />;
    case "timeline":
      return <TimelineTab data={data} />;
    case "projects":
      return <ProjectsTab data={data} />;
    case "services":
      return <ServicesTab data={data} />;
    case "technical":
      return <TechnicalTab data={data} />;
    case "marketing":
      return <MarketingTab />;
    case "revenue":
      return <RevenueTab data={data} />;
    case "opportunities":
      return <OpportunitiesTab data={data} />;
    case "roadmap":
      return <RoadmapTab data={data} />;
    case "notes":
      return <NotesTab data={data} />;
    default:
      return <OverviewTab data={data} />;
  }
}
