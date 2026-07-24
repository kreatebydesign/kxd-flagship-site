"use client";

import type { ReactNode } from "react";
import type { StaffGuidancePrompt } from "@/lib/staff/types";
import type { StaffGuidanceResponse } from "@/lib/staff/guidance";
import { KxdButton } from "@/components/os";

export interface StaffGuidancePanelProps {
  prompts: StaffGuidancePrompt[];
  lastResponse: StaffGuidanceResponse | null;
  onSelectPrompt: (promptId: string) => void;
  loading?: boolean;
  /** Optional calm control under guidance (Ask Matt for help). */
  askHelp?: ReactNode;
}

export function StaffGuidancePanel({
  prompts,
  lastResponse,
  onSelectPrompt,
  loading = false,
  askHelp = null,
}: StaffGuidancePanelProps) {
  return (
    <aside className="kxd-os-card kxd-os-ops-card-padding" aria-label="KXD Intelligence guidance">
      <p className="kxd-os-section__label">KXD Intelligence</p>
      <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
        Ask for explanation, sequencing, or when Matt must approve. Guidance stays inside your
        permission boundary.
      </p>

      <div
        className="kxd-os-ops-quick-grid"
        style={{ marginTop: "1rem", gridTemplateColumns: "1fr" }}
      >
        {prompts.map((prompt) => (
          <KxdButton
            key={prompt.id}
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => onSelectPrompt(prompt.id)}
            className="kxd-os-ops-quick-cell"
            style={{ textAlign: "left", width: "100%" }}
          >
            {prompt.label}
          </KxdButton>
        ))}
      </div>

      {lastResponse ? (
        <div className="kxd-os-card" style={{ marginTop: "1.25rem", padding: "1rem" }}>
          <p className="kxd-os-section__label">Latest guidance</p>
          <p className="kxd-os-card__title" style={{ marginTop: "0.5rem" }}>
            {lastResponse.conciseAnswer}
          </p>
          <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
            Recommended next step
          </p>
          <p style={{ marginTop: "0.25rem" }}>{lastResponse.recommendedNextStep}</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
            {lastResponse.reason}
          </p>
          {lastResponse.involveMatt ? (
            <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
              Matt involvement: {lastResponse.mattReason ?? "Approval or judgment required."}
              {" "}If you are blocked, ask Matt for help below.
            </p>
          ) : null}
          {lastResponse.warning ? (
            <p className="kxd-os-meta" style={{ marginTop: "0.75rem", color: "var(--kxd-os-warning)" }}>
              {lastResponse.warning}
            </p>
          ) : null}
          {lastResponse.evidence.length > 0 ? (
            <ul className="kxd-os-meta" style={{ marginTop: "0.75rem", paddingLeft: "1.1rem" }}>
              {lastResponse.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="kxd-os-meta" style={{ marginTop: "1.25rem" }}>
          Select a prompt when something feels unclear. Responses are deterministic and evidence-bound.
        </p>
      )}

      {askHelp ? <div style={{ marginTop: "1.25rem" }}>{askHelp}</div> : null}
    </aside>
  );
}
