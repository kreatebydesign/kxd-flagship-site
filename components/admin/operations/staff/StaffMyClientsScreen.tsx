"use client";

import Link from "next/link";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type { StaffMyClientsData } from "@/lib/staff/client-context/types";

function engagementVariant(
  status: string,
): "default" | "pending" | "warning" | "success" | "status" | "critical" {
  if (status === "active") return "success";
  if (status === "paused") return "pending";
  if (status === "prospect") return "status";
  if (status === "archived") return "default";
  return "default";
}

export function StaffMyClientsScreen({ data }: { data: StaffMyClientsData }) {
  return (
    <OperationsShell activeId="staff-my-clients" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
        <OperationsPageHero
          eyebrow="Assigned clients"
          title="My clients"
          lead="Clients explicitly assigned to you. Access comes from staff client assignments — not from work items or URLs alone."
        />

        <p className="kxd-os-meta" style={{ marginBottom: "1.25rem" }}>
          <Link href="/admin/operations/staff" className="kxd-os-link-quiet">
            Back to staff home
          </Link>
        </p>

        {data.clients.length === 0 ? (
          <OpsCard className="kxd-os-ops-card-padding">
            <OpsEmpty message="No clients assigned yet" />
            <p style={{ marginTop: "0.75rem" }}>
              When Matt assigns a client to you in staff client assignments, it will appear here
              with contacts, project context, and your work — without opening the full client workspace.
            </p>
            <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
              You can still complete assigned work from{" "}
              <Link href="/admin/operations/staff/my-work" className="kxd-os-link-quiet">
                My work
              </Link>
              .
            </p>
          </OpsCard>
        ) : (
          <section aria-label="Assigned clients">
            <OpsSectionHead label="Your clients" count={data.clients.length} />
            <OpsCard>
              {data.clients.map((client) => (
                <OpsListRow key={client.clientId} href={client.href}>
                  <div className="kxd-os-ops-list-row__main">
                    <div className="kxd-os-ops-list-row__head">
                      <p className="kxd-os-ops-list-row__title">{client.name}</p>
                      <OpsStatusBadge
                        label={client.engagementStatus.replace(/-/g, " ")}
                        variant={engagementVariant(client.engagementStatus)}
                      />
                    </div>
                    <p className="kxd-os-meta">
                      {client.openWorkCount > 0
                        ? `${client.openWorkCount} open work item${client.openWorkCount === 1 ? "" : "s"}`
                        : "No open work assigned"}
                      {client.websiteUrl ? ` · ${client.websiteUrl}` : ""}
                    </p>
                  </div>
                </OpsListRow>
              ))}
            </OpsCard>
          </section>
        )}
      </KxdPage>
    </OperationsShell>
  );
}
