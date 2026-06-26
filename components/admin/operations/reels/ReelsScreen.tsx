import Link from "next/link";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsFocusPill, OpsKpiStrip, OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function platformLabel(p: string): string {
  const map: Record<string, string> = {
    "instagram-reel": "Instagram Reel",
    "facebook-reel": "Facebook Reel",
    tiktok: "TikTok",
    linkedin: "LinkedIn",
    youtube: "YouTube",
    website: "Website",
    other: "Other",
  };
  return map[p] || p || "—";
}

function styleLabel(s: string): string {
  const map: Record<string, string> = {
    cinematic: "Cinematic",
    luxury: "Luxury",
    editorial: "Editorial",
    "launch-reveal": "Launch Reveal",
    "case-study": "Case Study",
    energetic: "Energetic",
    minimal: "Minimal",
    bold: "Bold",
    documentary: "Documentary",
  };
  return map[s] || s || "—";
}

function clientName(doc: AnyDoc): string {
  if (doc.clientName) return String(doc.clientName);
  if (doc.client && typeof doc.client === "object") return String(doc.client.name || "Client");
  return "Client";
}

function statusVariant(status: string): "default" | "tier" | "warning" | "critical" | "success" {
  switch (status) {
    case "new":
      return "tier";
    case "storyboarding":
    case "scripting":
    case "editing":
    case "review":
      return "warning";
    case "approved":
    case "delivered":
      return "success";
    case "archived":
      return "default";
    default:
      return "critical";
  }
}

function stageVariant(status: string): "default" | "tier" | "warning" | "critical" | "success" {
  switch (status) {
    case "complete":
      return "success";
    case "capturing":
    case "generating":
      return "warning";
    case "failed":
      return "critical";
    default:
      return "default";
  }
}

function stageLabel(stage: "screenshot" | "storyboard", value: string): string {
  if (stage === "screenshot") {
    const map: Record<string, string> = {
      idle: "Not Captured",
      capturing: "Capturing",
      complete: "Captured",
      failed: "Failed",
    };
    return map[value] ?? "Not Captured";
  }
  const map: Record<string, string> = {
    idle: "Not Generated",
    generating: "Generating",
    complete: "Generated",
    failed: "Failed",
  };
  return map[value] ?? "Not Generated";
}

export interface ReelsScreenProps {
  docs: AnyDoc[];
  counts: {
    total: number;
    complete: number;
    generating: number;
    screenshotted: number;
  };
}

export function ReelsScreen({ docs, counts }: ReelsScreenProps) {
  return (
    <OperationsShell activeId="reels">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Reels Production"
          title="Website Reel Production Flow"
          lead="URL capture to storyboard delivery — track production status and push reels through the pipeline."
        />

        <OpsKpiStrip
          items={[
            { label: "Total Reels", value: String(counts.total), sub: "All website reels" },
            { label: "Screenshotted", value: String(counts.screenshotted), sub: "Capture complete" },
            { label: "Storyboards Done", value: String(counts.complete), sub: "Ready for delivery" },
            { label: "In Progress", value: String(counts.generating), sub: "Currently generating", alert: counts.generating > 0 },
          ]}
        />

        <OpsFocusPill
          label="Production Flow"
          description="Create request → capture screenshots → generate storyboard → review and deliver."
          tone="default"
        />

        <KxdSection label="Production Pipeline">
          {docs.length === 0 ? (
            <KxdEmptyState
              title="No website reels yet."
              description="Create your first reel request to start the production flow."
              action={
                <Link href="/admin/operations/reels/new">
                  <KxdButton>Create First Reel</KxdButton>
                </Link>
              }
            />
          ) : (
            <KxdTable>
              <KxdTableHead>
                <KxdTableRow>
                  <KxdTableHeaderCell>Reel</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Platform</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Status</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Screenshots</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Storyboard</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Actions</KxdTableHeaderCell>
                </KxdTableRow>
              </KxdTableHead>
              <KxdTableBody>
                {docs.map((doc) => {
                  const ss = String(doc.screenshotStatus ?? "idle");
                  const sb = String(doc.storyboardGenerationStatus ?? "idle");
                  const shotCount = Array.isArray(doc.capturedScreenshots) ? doc.capturedScreenshots.length : 0;
                  return (
                    <KxdTableRow key={doc.id as number}>
                      <KxdTableCell primary>
                        <p className="kxd-os-body">{doc.videoTitle || "Untitled Reel"}</p>
                        <p className="kxd-os-ops-table-meta">
                          {clientName(doc)} · {styleLabel(String(doc.visualStyle ?? ""))}
                        </p>
                      </KxdTableCell>
                      <KxdTableCell>{platformLabel(String(doc.platform ?? ""))}</KxdTableCell>
                      <KxdTableCell>
                        <OpsStatusBadge
                          label={String(doc.status ?? "new").replace(/-/g, " ")}
                          variant={statusVariant(String(doc.status ?? "new"))}
                        />
                      </KxdTableCell>
                      <KxdTableCell>
                        <OpsStatusBadge label={stageLabel("screenshot", ss)} variant={stageVariant(ss)} />
                        <p className="kxd-os-ops-table-meta">{shotCount} captured</p>
                      </KxdTableCell>
                      <KxdTableCell>
                        <OpsStatusBadge label={stageLabel("storyboard", sb)} variant={stageVariant(sb)} />
                      </KxdTableCell>
                      <KxdTableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/operations/reels/${doc.id}`}>
                            <KxdButton size="sm" variant="secondary">
                              View
                            </KxdButton>
                          </Link>
                          <Link href={`/admin/collections/promo-video-requests/${doc.id}`}>
                            <KxdButton size="sm" variant="ghost">
                              Payload
                            </KxdButton>
                          </Link>
                        </div>
                      </KxdTableCell>
                    </KxdTableRow>
                  );
                })}
              </KxdTableBody>
            </KxdTable>
          )}
        </KxdSection>

        <KxdSection label="Pipeline Health">
          <KxdSurface variant="panel" className="kxd-os-operations-panel">
            <div className="kxd-os-ops-kpi-grid">
              <KxdMetric
                label="Capture Completion"
                value={`${counts.total > 0 ? Math.round((counts.screenshotted / counts.total) * 100) : 0}%`}
              />
              <KxdMetric
                label="Storyboard Completion"
                value={`${counts.total > 0 ? Math.round((counts.complete / counts.total) * 100) : 0}%`}
              />
              <KxdMetric
                label="Generating Now"
                value={String(counts.generating)}
                sub={counts.generating > 0 ? "Active jobs in queue" : "No active jobs"}
              />
            </div>
          </KxdSurface>
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
