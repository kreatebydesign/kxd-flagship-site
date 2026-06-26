import Link from "next/link";
import { KxdBadge, KxdEmptyState, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsListRow,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import type { StrategyVaultData, VaultView } from "@/lib/executive-notes";
import { QuickCaptureNote } from "./QuickCaptureNote";

const VIEWS: Array<{ id: VaultView; label: string }> = [
  { id: "all", label: "All Notes" },
  { id: "by-client", label: "By Client" },
  { id: "pinned", label: "Pinned" },
  { id: "recent", label: "Recently Updated" },
  { id: "reminders", label: "Reminders" },
  { id: "opportunities", label: "Opportunities" },
  { id: "research", label: "Research" },
  { id: "search", label: "Search" },
];

function viewHref(view: VaultView, clientId?: number, q?: string): string {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (clientId) params.set("client", String(clientId));
  if (q) params.set("q", q);
  const s = params.toString();
  return s ? `/admin/operations/strategy?${s}` : "/admin/operations/strategy";
}

export function StrategyVaultScreen({
  data,
  activeView,
  searchQuery,
  clientId,
}: {
  data: StrategyVaultData;
  activeView: VaultView;
  searchQuery?: string;
  clientId?: number;
}) {
  return (
    <OperationsShell activeId="strategy">
      <KxdPage className="kxd-os-page--ops">
        <div className="kxd-os-ops-section-head">
          <OperationsPageHero
            eyebrow="KXD OS · Institutional Memory"
            title="Strategy Vault"
            lead="Executive notes and relationship intelligence — the second brain of every client partnership."
          />
          <QuickCaptureNote />
        </div>

        <nav className="kxd-os-workspace-tabs" aria-label="Vault views" style={{ marginBottom: "1.25rem" }}>
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={viewHref(v.id, clientId, searchQuery)}
              className={`kxd-os-workspace-tab${activeView === v.id ? " kxd-os-workspace-tab--active" : ""}`}
            >
              {v.label}
            </Link>
          ))}
        </nav>

        <form method="get" action="/admin/operations/strategy" style={{ marginBottom: "1.5rem" }}>
          <input type="hidden" name="view" value="search" />
          {clientId ? <input type="hidden" name="client" value={clientId} /> : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              className="kxd-os-input"
              name="q"
              placeholder="Search title, content, tags, author…"
              defaultValue={searchQuery}
              style={{ flex: 1, minWidth: "14rem" }}
            />
            <button type="submit" className="kxd-os-btn kxd-os-btn--ghost">
              Search
            </button>
          </div>
        </form>

        {data.reminders.length > 0 ? (
          <KxdSection label="Reminders">
            <div className="kxd-os-list-stack">
              {data.reminders.slice(0, 8).map((r) => (
                <OpsListRow key={r.id} href={r.href}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <div>
                      <p className="kxd-os-body">{r.title}</p>
                      <p className="kxd-os-meta">
                        {r.clientName} · {r.reminderDate.slice(0, 10)}
                      </p>
                    </div>
                    <KxdBadge variant={r.overdue ? "critical" : "warning"}>
                      {r.overdue ? "Overdue" : `${r.daysUntil}d`}
                    </KxdBadge>
                  </div>
                </OpsListRow>
              ))}
            </div>
          </KxdSection>
        ) : null}

        <div className="kxd-os-operations-columns">
          {activeView === "by-client" || activeView === "all" ? (
            <KxdSection label="Clients">
              <div className="kxd-os-list-stack">
                {data.clients.map((c) => (
                  <OpsListRow key={c.id} href={viewHref("by-client", c.id)}>
                    <p className="kxd-os-body">{c.name}</p>
                    <p className="kxd-os-meta">{c.noteCount} note{c.noteCount === 1 ? "" : "s"}</p>
                  </OpsListRow>
                ))}
              </div>
            </KxdSection>
          ) : null}

          <KxdSection label="Notes">
            <OpsSectionHead
              label={VIEWS.find((v) => v.id === activeView)?.label ?? "Notes"}
              count={data.notes.length}
              href="/admin/collections/executive-notes/create"
              linkText="New note"
            />
            {data.notes.length === 0 ? (
              <KxdEmptyState
                title="No notes yet"
                description="Capture strategy, meetings, opportunities, and institutional memory."
              />
            ) : (
              <div className="kxd-os-list-stack">
                {data.notes.map((note) => (
                  <OpsListRow key={note.id} href={note.href}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                      <div>
                        <p className="kxd-os-body">
                          {note.pinned ? "📌 " : ""}
                          {note.title}
                        </p>
                        <p className="kxd-os-meta">
                          {note.clientName} · {note.noteType}
                          {note.summary ? ` · ${note.summary.slice(0, 80)}` : ""}
                        </p>
                      </div>
                      <KxdBadge variant={note.priority === "critical" ? "critical" : "default"}>
                        {note.priority}
                      </KxdBadge>
                    </div>
                  </OpsListRow>
                ))}
              </div>
            )}
          </KxdSection>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
