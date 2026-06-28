"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { KxdButton, KxdSelect } from "@/components/os";
import { OpsEmpty, OpsListRow } from "@/components/admin/operations/shared/OpsBriefing";
import type { GenesisSessionListItem, GenesisTemplateId } from "@/lib/genesis/types";
import { listGenesisTemplates } from "@/lib/genesis/templates";

const TEMPLATES = listGenesisTemplates();

export function GenesisHub({
  sessions,
  incomplete,
}: {
  sessions: GenesisSessionListItem[];
  incomplete: GenesisSessionListItem[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<GenesisTemplateId>("standard-business");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const startGenesis = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/genesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (!data.success || !data.session?.id) {
        setError(data.message ?? "Could not start Genesis.");
        return;
      }
      router.push(`/admin/operations/genesis/${data.session.id}`);
    } catch {
      setError("Network error — try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="kxd-os-ops-workflow-stack">
      <div className="kxd-os-ops-genesis-start">
        <div>
          <p className="kxd-os-title">Start a new engagement</p>
          <p className="kxd-os-meta">
            Choose an industry template and begin architecting the client blueprint.
          </p>
        </div>
        <div className="kxd-os-ops-genesis-start__actions">
          <KxdSelect
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value as GenesisTemplateId)}
            aria-label="Industry template"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </KxdSelect>
          <KxdButton onClick={startGenesis} loading={creating} disabled={creating}>
            Begin Genesis →
          </KxdButton>
        </div>
      </div>

      {error ? <div className="kxd-os-ops-alert kxd-os-ops-alert--error">{error}</div> : null}

      {incomplete.length > 0 ? (
        <section>
          <h2 className="kxd-os-section-label">Resume incomplete</h2>
          <div className="kxd-os-list-stack" style={{ marginTop: "0.75rem" }}>
            {incomplete.map((s) => (
              <OpsListRow key={s.id} href={s.href}>
                <p className="kxd-os-body">{s.sessionLabel}</p>
                <p className="kxd-os-meta">
                  {s.templateId.replace(/-/g, " ")} · {s.progressPercent}% · {s.status.replace(/-/g, " ")}
                </p>
              </OpsListRow>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="kxd-os-section-label">All Genesis sessions</h2>
        {sessions.length === 0 ? (
          <OpsEmpty message="No Genesis sessions yet — start the first engagement blueprint." />
        ) : (
          <div className="kxd-os-list-stack" style={{ marginTop: "0.75rem" }}>
            {sessions.map((s) => (
              <OpsListRow key={s.id} href={s.href}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <p className="kxd-os-body">{s.sessionLabel}</p>
                    <p className="kxd-os-meta">
                      {s.clientName ? `${s.clientName} · ` : ""}
                      {s.progressPercent}% discovery · readiness {s.launchReadiness}%
                    </p>
                  </div>
                  <span className="kxd-os-meta">{s.status.replace(/-/g, " ")}</span>
                </div>
              </OpsListRow>
            ))}
          </div>
        )}
      </section>

      <p className="kxd-os-meta">
        <Link href="/admin/operations/clients" className="kxd-os-link-quiet">← Client Portfolio</Link>
      </p>
    </div>
  );
}
