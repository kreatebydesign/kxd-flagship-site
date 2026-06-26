import Link from "next/link";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import {
  KxdButton,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  KxdSurface,
  KxdTable,
  KxdTableBody,
  KxdTableCell,
  KxdTableHead,
  KxdTableHeaderCell,
  KxdTableRow,
} from "@/components/os";
import type {
  CampaignHealthScore,
  CreativeSystemHealth,
  OrphanedCreativeItems,
} from "@/lib/creative-intelligence";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

type PriorityItem = {
  label: string;
  client?: string;
  status?: string;
  priority?: string;
};

function buildPriorityQueue(data: {
  campaigns: AnyDoc[];
  flyers: AnyDoc[];
  videos: AnyDoc[];
  social: AnyDoc[];
}): PriorityItem[] {
  const all: PriorityItem[] = [];
  const push = (arr: AnyDoc[]) =>
    arr.forEach((x) =>
      all.push({
        label: x.campaignTitle || x.flyerTitle || x.videoTitle || x.postTitle || "Untitled",
        client: x.client?.name || "Client",
        status: x.status,
        priority: x.priority,
      }),
    );

  push(data.campaigns);
  push(data.flyers);
  push(data.videos);
  push(data.social);

  const priorityScore = (p?: string) => (p === "urgent" ? 3 : p === "high" ? 2 : p === "normal" ? 1 : 0);
  return all.sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority)).slice(0, 8);
}

function statusVariant(status?: string): "default" | "warning" | "critical" | "success" | "tier" {
  if (!status) return "default";
  if (["blocked", "stalled"].includes(status)) return "critical";
  if (["in-review", "review"].includes(status)) return "warning";
  if (["done", "completed", "approved"].includes(status)) return "success";
  return "tier";
}

function priorityVariant(priority?: string): "default" | "warning" | "critical" | "success" | "tier" {
  if (!priority) return "default";
  if (priority === "urgent") return "critical";
  if (priority === "high") return "warning";
  if (priority === "normal") return "tier";
  return "default";
}

export interface CreativeScreenProps {
  campaigns: AnyDoc[];
  flyers: AnyDoc[];
  videos: AnyDoc[];
  social: AnyDoc[];
  campaignCount: number;
  flyerCount: number;
  videoCount: number;
  socialCount: number;
  assetCount: number;
  health: CreativeSystemHealth;
  scores: CampaignHealthScore[];
  orphaned: OrphanedCreativeItems;
}

export function CreativeScreen({
  campaigns,
  flyers,
  videos,
  social,
  campaignCount,
  flyerCount,
  videoCount,
  socialCount,
  assetCount,
  health,
  scores,
  orphaned,
}: CreativeScreenProps) {
  const priorityQueue = buildPriorityQueue({ campaigns, flyers, videos, social });
  const orphanedRows = [
    { label: "Flyers without campaign", value: orphaned.flyers.length },
    { label: "Videos without campaign", value: orphaned.videos.length },
    { label: "Social posts without campaign", value: orphaned.socialPosts.length },
    { label: "Assets without campaign", value: orphaned.assets.length },
  ];

  return (
    <OperationsShell activeId="creative">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Creative Engine"
          title="Studio Queue"
          lead="Creative operations command view across campaigns, requests, production health, and orphaned assets."
        />

        <KxdSection label="Creative Inventory">
          <OpsKpiStrip
            items={[
              { label: "Campaigns", value: String(campaignCount), sub: "Total campaigns" },
              { label: "Flyers", value: String(flyerCount), sub: "Creative requests" },
              { label: "Videos", value: String(videoCount), sub: "Production items" },
              { label: "Social", value: String(socialCount), sub: "Post requests" },
              { label: "Assets", value: String(assetCount), sub: "Library size" },
            ]}
          />
        </KxdSection>

        <KxdSection label="Studio Queue">
          <OpsSectionHead label="Priority Queue" count={priorityQueue.length} href="/admin/collections/creative-campaigns" linkText="Open Payload →" />
          {priorityQueue.length === 0 ? (
            <KxdEmptyState
              title="No priority items."
              description="Creative requests will appear here as campaigns and production requests are created."
            />
          ) : (
            <KxdSurface variant="glass" className="kxd-os-ops-briefing-surface">
              <div className="kxd-os-list-stack">
                {priorityQueue.map((item, idx) => (
                  <OpsListRow key={`${item.label}-${idx}`}>
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{item.label}</p>
                      <p className="kxd-os-ops-list-row__meta">{item.client ?? "Client"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OpsStatusBadge label={item.status ?? "open"} variant={statusVariant(item.status)} />
                      <OpsStatusBadge label={item.priority ?? "normal"} variant={priorityVariant(item.priority)} />
                    </div>
                  </OpsListRow>
                ))}
              </div>
            </KxdSurface>
          )}
        </KxdSection>

        <div className="kxd-os-operations-columns">
          <KxdSection label="System Health Snapshot">
            <div className="kxd-os-ops-kpi-grid">
              <KxdMetric label="Active Campaigns" value={String(health.activeCampaigns)} />
              <KxdMetric label="Total Requests" value={String(health.totalRequests)} />
              <KxdMetric label="Stalled Items" value={String(health.stalledItems)} sub={health.stalledItems > 0 ? "Needs action" : "Clear"} />
              <KxdMetric label="Missing Brand Kits" value={String(health.missingBrandKits)} />
            </div>
          </KxdSection>

          <KxdSection label="Orphaned Items">
            <KxdSurface variant="panel" className="kxd-os-operations-panel">
              <div className="kxd-os-list-stack">
                {orphanedRows.map((row) => (
                  <div key={row.label} className="kxd-os-list-row kxd-os-list-row--split">
                    <p className="kxd-os-body">{row.label}</p>
                    <p className="kxd-os-body">{row.value}</p>
                  </div>
                ))}
              </div>
            </KxdSurface>
          </KxdSection>
        </div>

        <KxdSection label="Campaign Health">
          {scores.length === 0 ? (
            <KxdEmptyState title="No active campaigns." />
          ) : (
            <KxdTable>
              <KxdTableHead>
                <KxdTableRow>
                  <KxdTableHeaderCell>Campaign</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Score</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Status</KxdTableHeaderCell>
                </KxdTableRow>
              </KxdTableHead>
              <KxdTableBody>
                {scores.slice(0, 12).map((campaign) => (
                  <KxdTableRow key={campaign.campaignId}>
                    <KxdTableCell primary>{campaign.title}</KxdTableCell>
                    <KxdTableCell>{campaign.score}</KxdTableCell>
                    <KxdTableCell>
                      <OpsStatusBadge
                        label={campaign.score >= 80 ? "strong" : campaign.score >= 50 ? "stable" : "risk"}
                        variant={campaign.score >= 80 ? "success" : campaign.score >= 50 ? "tier" : "critical"}
                      />
                    </KxdTableCell>
                  </KxdTableRow>
                ))}
              </KxdTableBody>
            </KxdTable>
          )}
        </KxdSection>

        <KxdSection label="Production Actions">
          <div className="kxd-os-operations-actions">
            <Link href="/admin/operations/reels">
              <KxdButton>Open Reels</KxdButton>
            </Link>
            <Link href="/admin/collections/creative-campaigns">
              <KxdButton variant="secondary">Campaign Collection</KxdButton>
            </Link>
            <Link href="/admin/collections/creative-assets">
              <KxdButton variant="ghost">Asset Library</KxdButton>
            </Link>
          </div>
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
