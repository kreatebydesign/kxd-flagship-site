/**
 * /admin/operations/clients/[id]
 * KXD OS — Executive Client Workspace (modular modules per client)
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { WorkspaceTabContent } from "@/components/admin/operations/client-workspace/WorkspaceTabContent";
import { WorkspaceTabNav } from "@/components/admin/operations/client-workspace/WorkspaceTabNav";
import { fetchClientWorkspace } from "@/lib/executive-client-workspace/fetch-client-workspace";
import {
  EXECUTIVE_PRIORITY_LABEL,
  EXECUTIVE_STATUS_LABEL,
  EXECUTIVE_TIER_LABEL,
} from "@/lib/executive-client-profile";
import {
  isWorkspaceTabId,
  WORKSPACE_C,
  WORKSPACE_TABS,
} from "@/lib/executive-client-workspace/theme";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ExecutiveClientWorkspacePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) notFound();

  const activeTab = isWorkspaceTabId(tabParam) ? tabParam : "overview";
  const data = await fetchClientWorkspace(clientId);
  if (!data) notFound();

  const { row, editProfileHref } = data;

  return (
    <div style={{ minHeight: "100vh", background: WORKSPACE_C.bgBase, color: WORKSPACE_C.cream }}>
      <header
        style={{
          borderBottom: `1px solid ${WORKSPACE_C.border}`,
          padding: "1.25rem 1.5rem",
          background: "rgba(8,8,8,0.95)",
        }}
      >
        <div className="mx-auto max-w-screen-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <KxdLogo height={20} />
            <div>
              <Link
                href="/admin/operations/clients"
                style={{
                  fontFamily: WORKSPACE_C.sans,
                  fontSize: "0.625rem",
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: WORKSPACE_C.goldDim,
                  textDecoration: "none",
                }}
              >
                ← Client Command Center
              </Link>
              <h1
                style={{
                  fontFamily: WORKSPACE_C.serif,
                  fontWeight: 300,
                  fontSize: "1.75rem",
                  color: WORKSPACE_C.cream,
                  marginTop: "0.375rem",
                  lineHeight: 1.1,
                }}
              >
                {row.name}
              </h1>
              <p
                style={{
                  fontFamily: WORKSPACE_C.sans,
                  fontSize: "0.75rem",
                  color: WORKSPACE_C.creamMuted,
                  marginTop: "0.375rem",
                  letterSpacing: "0.04em",
                }}
              >
                Client Workspace
                {row.tier && ` · ${EXECUTIVE_TIER_LABEL[row.tier]}`}
                {row.relationshipStatus && ` · ${EXECUTIVE_STATUS_LABEL[row.relationshipStatus]}`}
                {row.internalPriority && ` · ${EXECUTIVE_PRIORITY_LABEL[row.internalPriority]}`}
              </p>
            </div>
          </div>
          <Link
            href={editProfileHref}
            style={{
              fontFamily: WORKSPACE_C.sans,
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: WORKSPACE_C.bgBase,
              background: WORKSPACE_C.gold,
              padding: "0.5rem 1rem",
              textDecoration: "none",
            }}
          >
            {data.profile ? "Edit Executive Profile" : "Create Executive Profile"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        <WorkspaceTabNav clientId={clientId} activeTab={activeTab} />

        <div style={{ marginTop: "1.75rem" }}>
          <WorkspaceTabContent tab={activeTab} data={data} />
        </div>

        <p
          style={{
            marginTop: "2.5rem",
            fontFamily: WORKSPACE_C.sans,
            fontSize: "0.625rem",
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.22)",
            textTransform: "uppercase",
          }}
        >
          Module: {WORKSPACE_TABS.find((t) => t.id === activeTab)?.label} · Client ID {clientId}
        </p>
      </main>
    </div>
  );
}
