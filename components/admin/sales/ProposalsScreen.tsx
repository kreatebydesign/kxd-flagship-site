"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { KxdBadge, KxdEmptyState, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { fmtDate, fmtMoney, resolveName, type SalesUiDoc } from "./shared";

function proposalVariant(status: string): "default" | "status" | "success" | "critical" | "warning" {
  switch (status) {
    case "accepted-contract-pending":
    case "approved":
      return "success";
    case "rejected":
    case "declined":
    case "expired":
      return "critical";
    case "sent":
    case "viewed":
    case "approved-for-sharing":
      return "status";
    case "revision-requested":
      return "warning";
    default:
      return "default";
  }
}

function orgsFromDoc(p: SalesUiDoc): string {
  const doc = p.builderDocument as { organizations?: Array<{ name?: string }> } | undefined;
  if (doc?.organizations?.length) {
    return doc.organizations.map((o) => o.name).filter(Boolean).join(" · ");
  }
  return "";
}

function primaryContact(p: SalesUiDoc): string {
  const doc = p.builderDocument as {
    contacts?: Array<{ name?: string; isPrimary?: boolean }>;
  } | undefined;
  const c = doc?.contacts?.find((x) => x.isPrimary) ?? doc?.contacts?.[0];
  return c?.name || "—";
}

function contractStatus(p: SalesUiDoc): string {
  if (p.relatedContract && typeof p.relatedContract === "object") {
    return String(p.relatedContract.status ?? "draft");
  }
  if (p.status === "accepted-contract-pending") return "draft pending";
  return "—";
}

export function ProposalsScreen({ proposals }: { proposals: SalesUiDoc[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [party, setParty] = useState("");

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      if (status && String(p.status) !== status) return false;
      const hay = [
        p.proposalNumber,
        p.title,
        resolveName(p.lead),
        resolveName(p.client),
        orgsFromDoc(p),
        primaryContact(p),
      ]
        .join(" ")
        .toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (party) {
        const partyHay = `${resolveName(p.lead)} ${resolveName(p.client)} ${orgsFromDoc(p)}`.toLowerCase();
        if (!partyHay.includes(party.toLowerCase())) return false;
      }
      return true;
    });
  }, [proposals, q, status, party]);

  const statuses = Array.from(new Set(proposals.map((p) => String(p.status ?? "draft")))).sort();

  return (
    <OperationsShell activeId="sales-proposals">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales"
          title="Proposals"
          lead="Draft, preview, share, and accept proposals. Acceptance prepares a contract draft for internal review — never auto-signs or charges."
        />

        <KxdSection>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "space-between",
              marginBottom: "1rem",
              flexWrap: "wrap",
              alignItems: "end",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flex: 1 }}>
              <label style={{ flex: "1 1 180px" }}>
                <span className="kxd-os-meta">Search</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Number, title, contact…"
                  style={{
                    width: "100%",
                    marginTop: 4,
                    border: "1px solid var(--kxd-os-line, #e2d8c8)",
                    borderRadius: 2,
                    padding: "0.55rem 0.7rem",
                    background: "var(--kxd-os-paper, #fffdf8)",
                  }}
                />
              </label>
              <label style={{ flex: "0 1 160px" }}>
                <span className="kxd-os-meta">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    border: "1px solid var(--kxd-os-line, #e2d8c8)",
                    borderRadius: 2,
                    padding: "0.55rem 0.7rem",
                    background: "var(--kxd-os-paper, #fffdf8)",
                  }}
                >
                  <option value="">All</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ flex: "1 1 160px" }}>
                <span className="kxd-os-meta">Prospect / client</span>
                <input
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  placeholder="Filter by party"
                  style={{
                    width: "100%",
                    marginTop: 4,
                    border: "1px solid var(--kxd-os-line, #e2d8c8)",
                    borderRadius: 2,
                    padding: "0.55rem 0.7rem",
                    background: "var(--kxd-os-paper, #fffdf8)",
                  }}
                />
              </label>
            </div>
            <Link href="/admin/sales/proposals/new" className="kxd-os-btn" style={{ borderRadius: 2 }}>
              New proposal
            </Link>
          </div>

          {filtered.length === 0 ? (
            <KxdEmptyState
              title={proposals.length === 0 ? "No proposals" : "No matching proposals"}
              description="Create a reusable proposal with scope groups, pricing, and acceptance that proceeds to contract review."
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                  minWidth: 980,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Number",
                      "Title",
                      "Prospect / client",
                      "Organizations",
                      "Contact",
                      "One-time",
                      "Monthly",
                      "Status",
                      "Ver",
                      "Expires",
                      "Viewed",
                      "Accepted",
                      "Contract",
                      "Updated",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "0.65rem 0.5rem",
                          borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)",
                          color: "var(--kxd-os-muted, #6f6a62)",
                          fontWeight: 500,
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id as number}>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {String(p.proposalNumber ?? "—")}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        <Link href={`/admin/sales/proposals/${p.id}`} style={{ textDecoration: "none" }}>
                          {String(p.title ?? "Proposal")}
                        </Link>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {resolveName(p.client) !== "—" ? resolveName(p.client) : resolveName(p.lead)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {orgsFromDoc(p) || "—"}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {primaryContact(p)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {fmtMoney(p.investment as number)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {p.recurringAmount ? fmtMoney(p.recurringAmount as number) : "—"}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        <KxdBadge variant={proposalVariant(String(p.status ?? "draft"))}>
                          {String(p.status ?? "draft")}
                        </KxdBadge>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        v{String(p.revisionNumber ?? 1)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {fmtDate(p.expiresAt as string)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {fmtDate(p.lastViewedAt as string)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {fmtDate(p.acceptedAt as string)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {contractStatus(p)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)" }}>
                        {fmtDate(p.updatedAt as string)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
