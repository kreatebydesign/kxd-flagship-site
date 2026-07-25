"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage } from "@/components/os";
import type { StaffOversightData } from "@/lib/staff/types";

type HelpRequestRowData = StaffOversightData["helpRequests"][number];

function HelpRequestRow({
  request,
  onDone,
  onError,
}: {
  request: HelpRequestRowData;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState<"answer" | "confirm" | "resolve" | null>(null);

  async function respond(options: {
    resolve: boolean;
    text?: string;
    mode?: "answer" | "confirm" | "resolve";
  }) {
    const text =
      options.text?.trim() ||
      response.trim() ||
      (options.resolve ? "Resolved." : "");
    setBusy(options.mode ?? (options.resolve ? "resolve" : "answer"));
    try {
      const res = await fetch(`/api/admin/staff/help/${request.helpId}`, {
        method: options.resolve ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: text,
          resolve: options.resolve,
        }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not update help request.");
      }
      setResponse("");
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update help request.");
    } finally {
      setBusy(null);
    }
  }

  const awaitingMatt = request.requiresMatt && !request.mattResponse;

  return (
    <div className="kxd-os-ops-list-row">
      <div className="kxd-os-ops-list-row__main">
        <div className="kxd-os-ops-list-row__head">
          <p className="kxd-os-ops-list-row__title">{request.summary}</p>
          <OpsStatusBadge
            label={awaitingMatt ? "needs you" : request.status}
            variant={awaitingMatt || request.status === "open" ? "warning" : "pending"}
          />
        </div>
        <p className="kxd-os-meta">
          {request.staffLabel}
          {request.workTitle ? ` · ${request.workTitle}` : ""}
          {" · "}
          {new Date(request.createdAt).toLocaleString()}
        </p>
        {request.intelligenceResponse ? (
          <div style={{ marginTop: "0.65rem" }}>
            <p className="kxd-os-section__label">KXD Intelligence</p>
            <p style={{ marginTop: "0.35rem" }}>{request.intelligenceResponse}</p>
            <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
              Source: {request.responseSource || "none"}
              {request.confidence ? ` · Confidence: ${request.confidence}` : ""}
              {request.requiresMatt ? " · Matt required" : ""}
            </p>
          </div>
        ) : null}
        {request.mattResponse ? (
          <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
            Your response: {request.mattResponse}
          </p>
        ) : null}
        {request.href ? (
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            <Link href={request.href} className="kxd-os-link-quiet">
              Open related work
            </Link>
          </p>
        ) : null}
        <textarea
          className="kxd-os-input"
          style={{ width: "100%", minHeight: "4rem", marginTop: "0.75rem" }}
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          placeholder="Clarify or override for Heather…"
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginTop: "0.75rem",
          }}
        >
          {request.intelligenceResponse ? (
            <KxdButton
              type="button"
              size="sm"
              variant="ghost"
              loading={busy === "confirm"}
              onClick={() =>
                respond({
                  resolve: true,
                  mode: "confirm",
                  text: "Confirmed. Proceed with the KXD Intelligence guidance.",
                })
              }
            >
              Confirm guidance
            </KxdButton>
          ) : null}
          <KxdButton
            type="button"
            size="sm"
            loading={busy === "answer"}
            disabled={!response.trim()}
            onClick={() => respond({ resolve: false, mode: "answer" })}
          >
            Clarify / override
          </KxdButton>
          <KxdButton
            type="button"
            size="sm"
            variant="ghost"
            loading={busy === "resolve"}
            onClick={() => respond({ resolve: true, mode: "resolve" })}
          >
            Resolve
          </KxdButton>
        </div>
      </div>
    </div>
  );
}

export interface StaffOversightScreenProps {
  data: StaffOversightData;
}

export function StaffOversightScreen({ data }: StaffOversightScreenProps) {
  const router = useRouter();
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [savingResponsibility, setSavingResponsibility] = useState(false);

  const firstMemberId = data.members[0]?.userId ?? "";
  const [staffUserId, setStaffUserId] = useState<string>(String(firstMemberId));
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [priority, setPriority] = useState<"critical" | "high" | "normal" | "low">("normal");
  const [dueDate, setDueDate] = useState("");
  const [plannedForDate, setPlannedForDate] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(true);

  const libraryOptions = useMemo(
    () => [
      { key: "review-client-submissions", label: "Review new client submissions" },
      { key: "website-review-inbox", label: "Check Website Review Inbox" },
      { key: "prepare-follow-ups", label: "Prepare approved follow-ups" },
      { key: "verify-invoice-status", label: "Verify invoice status" },
      { key: "review-onboarding-progress", label: "Review onboarding progress" },
      { key: "check-scheduling-requests", label: "Check scheduling requests" },
      { key: "update-internal-records", label: "Update internal records" },
      { key: "end-of-day-summary", label: "End-of-day operational summary" },
    ],
    [],
  );
  const [libraryKey, setLibraryKey] = useState(libraryOptions[0]?.key ?? "");
  const [respOwnerId, setRespOwnerId] = useState<string>(String(firstMemberId));
  const [respCadence, setRespCadence] = useState("weekdays");
  const [respApproval, setRespApproval] = useState(false);

  async function startPreview(staffId: number) {
    setPreviewingId(staffId);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff/preview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffUserId: staffId }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not start staff preview.");
      }
      router.push("/admin/operations/staff");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start staff preview.");
    } finally {
      setPreviewingId(null);
    }
  }

  async function assignWork() {
    setAssigning(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/staff/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffUserId: Number(staffUserId),
          title,
          summary,
          expectedOutcome,
          priority,
          dueDate: dueDate || null,
          plannedForDate: plannedForDate || null,
          requiresApproval,
        }),
      });
      const payload = (await res.json()) as {
        success?: boolean;
        error?: string;
        workId?: number;
      };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not assign work.");
      }
      setMessage(`Assigned work #${payload.workId}. Daily plan will include it on next load.`);
      setTitle("");
      setSummary("");
      setExpectedOutcome("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign work.");
    } finally {
      setAssigning(false);
    }
  }

  async function createResponsibility() {
    setSavingResponsibility(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/staff/responsibilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryKey,
          ownerUserId: respOwnerId ? Number(respOwnerId) : null,
          cadence: respCadence,
          requiresApproval: respApproval,
          active: true,
        }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not save responsibility.");
      }
      setMessage("Responsibility saved. It materializes into Work Engine items when due.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save responsibility.");
    } finally {
      setSavingResponsibility(false);
    }
  }

  async function mattAction(workId: number, mode: "return" | "approve") {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/staff/work/${workId}/matt`, {
        method: mode === "return" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: mode === "return" ? JSON.stringify({ note: "Please revise and resubmit." }) : undefined,
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not update work.");
      }
      setMessage(mode === "return" ? "Returned to staff for correction." : "Approved and completed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update work.");
    }
  }

  return (
    <OperationsShell activeId="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
        <OperationsPageHero
          eyebrow="Staff oversight"
          title="Team readiness"
          lead="Assign work, set priority and dates, manage recurring responsibilities, preview daily plans, and clear drafts awaiting your decision."
        />

        {error ? (
          <p className="kxd-os-meta" style={{ marginBottom: "1rem", color: "var(--kxd-os-critical)" }}>
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
            {message}
          </p>
        ) : null}

        <section aria-label="Team members">
          <OpsSectionHead label="Team members" count={data.members.length} />
          <OpsCard>
            {data.members.length === 0 ? (
              <p className="kxd-os-meta">No restricted staff roles configured yet.</p>
            ) : (
              data.members.map((member) => (
                <div key={member.userId} className="kxd-os-ops-list-row">
                  <div className="kxd-os-ops-list-row__main">
                    <div className="kxd-os-ops-list-row__head">
                      <p className="kxd-os-ops-list-row__title">{member.displayName}</p>
                      <OpsStatusBadge
                        label={member.onboardingCompleted ? "Onboarded" : "Welcome pending"}
                        variant={member.onboardingCompleted ? "success" : "pending"}
                      />
                    </div>
                    <p className="kxd-os-meta">
                      {member.roleTitle} · {member.email}
                    </p>
                    <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                      Start here: {member.startHereLabel ?? "—"}
                    </p>
                    <div style={{ marginTop: "0.75rem" }}>
                      <OpsKpiStrip
                        items={[
                          { label: "Open", value: String(member.assignedOpenCount) },
                          { label: "Plan", value: String(member.planActionableCount) },
                          { label: "Waiting", value: String(member.waitingOnMattCount) },
                          { label: "Training", value: `${member.trainingPercent}%` },
                        ]}
                      />
                    </div>
                    <div style={{ marginTop: "0.75rem" }}>
                      <KxdButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        loading={previewingId === member.userId}
                        onClick={() => startPreview(member.userId)}
                      >
                        View daily plan
                      </KxdButton>
                    </div>
                  </div>
                </div>
              ))
            )}
          </OpsCard>
        </section>

        <section style={{ marginTop: "1.5rem" }} aria-label="Assign work">
          <OpsSectionHead label="Assign work" />
          <OpsCard className="kxd-os-ops-card-padding">
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <label className="kxd-os-meta">
                Staff member
                <select
                  className="kxd-os-input"
                  style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
                  value={staffUserId}
                  onChange={(e) => setStaffUserId(e.target.value)}
                >
                  {data.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="kxd-os-meta">
                Title
                <input
                  className="kxd-os-input"
                  style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="kxd-os-meta">
                Context
                <textarea
                  className="kxd-os-input"
                  style={{ display: "block", width: "100%", marginTop: "0.35rem", minHeight: "4rem" }}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </label>
              <label className="kxd-os-meta">
                Expected outcome
                <textarea
                  className="kxd-os-input"
                  style={{ display: "block", width: "100%", marginTop: "0.35rem", minHeight: "4rem" }}
                  value={expectedOutcome}
                  onChange={(e) => setExpectedOutcome(e.target.value)}
                />
              </label>
              <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))" }}>
                <label className="kxd-os-meta">
                  Priority
                  <select
                    className="kxd-os-input"
                    style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <label className="kxd-os-meta">
                  Due date
                  <input
                    type="date"
                    className="kxd-os-input"
                    style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
                <label className="kxd-os-meta">
                  Planned for
                  <input
                    type="date"
                    className="kxd-os-input"
                    style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
                    value={plannedForDate}
                    onChange={(e) => setPlannedForDate(e.target.value)}
                  />
                </label>
              </div>
              <label className="kxd-os-meta" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                />
                Requires Matt approval
              </label>
              <KxdButton
                type="button"
                loading={assigning}
                disabled={!title.trim() || !staffUserId}
                onClick={assignWork}
              >
                Assign to daily plan
              </KxdButton>
            </div>
          </OpsCard>
        </section>

        <section style={{ marginTop: "1.5rem" }} aria-label="Recurring responsibilities">
          <OpsSectionHead label="Recurring responsibilities" count={data.responsibilities.length} />
          <OpsCard className="kxd-os-ops-card-padding">
            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
              <label className="kxd-os-meta">
                Library template
                <select
                  className="kxd-os-input"
                  style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
                  value={libraryKey}
                  onChange={(e) => setLibraryKey(e.target.value)}
                >
                  {libraryOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="kxd-os-meta">
                Owner
                <select
                  className="kxd-os-input"
                  style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
                  value={respOwnerId}
                  onChange={(e) => setRespOwnerId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {data.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="kxd-os-meta">
                Cadence
                <select
                  className="kxd-os-input"
                  style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
                  value={respCadence}
                  onChange={(e) => setRespCadence(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly (1st)</option>
                </select>
              </label>
              <label className="kxd-os-meta" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={respApproval}
                  onChange={(e) => setRespApproval(e.target.checked)}
                />
                Requires approval
              </label>
              <KxdButton type="button" loading={savingResponsibility} onClick={createResponsibility}>
                Create responsibility
              </KxdButton>
            </div>
            {data.responsibilities.length === 0 ? (
              <p className="kxd-os-meta">No responsibilities configured. Nothing is assigned by default.</p>
            ) : (
              data.responsibilities.map((row) => (
                <div key={row.id} className="kxd-os-ops-list-row">
                  <div className="kxd-os-ops-list-row__main">
                    <p className="kxd-os-ops-list-row__title">{row.title}</p>
                    <p className="kxd-os-meta">
                      {row.ownerLabel} · {row.cadence}
                      {row.active ? "" : " · paused"}
                      {row.requiresApproval ? " · approval required" : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </OpsCard>
        </section>

        <section style={{ marginTop: "1.5rem" }} aria-label="Drafts awaiting approval">
          <OpsSectionHead
            label="Drafts awaiting Matt"
            count={data.draftsAwaitingApproval.length}
          />
          <OpsCard>
            {data.draftsAwaitingApproval.length === 0 ? (
              <p className="kxd-os-meta">No drafts waiting on Matt right now.</p>
            ) : (
              data.draftsAwaitingApproval.map((draft) => (
                <div key={draft.workId} className="kxd-os-ops-list-row">
                  <div className="kxd-os-ops-list-row__main">
                    <OpsListRow href={draft.href}>
                      <div>
                        <p className="kxd-os-ops-list-row__title">{draft.title}</p>
                        <p className="kxd-os-meta">Prepared by {draft.assigneeLabel}</p>
                      </div>
                    </OpsListRow>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <KxdButton type="button" size="sm" variant="ghost" onClick={() => mattAction(draft.workId, "approve")}>
                        Approve
                      </KxdButton>
                      <KxdButton type="button" size="sm" variant="ghost" onClick={() => mattAction(draft.workId, "return")}>
                        Return
                      </KxdButton>
                    </div>
                  </div>
                </div>
              ))
            )}
          </OpsCard>
        </section>

        <section style={{ marginTop: "1.5rem" }} aria-label="Help requests">
          <OpsSectionHead label="Help requests" count={data.helpRequests.length} />
          <OpsCard className="kxd-os-ops-card-padding">
            {data.helpRequests.length === 0 ? (
              <p className="kxd-os-meta">No open help requests.</p>
            ) : (
              data.helpRequests.map((request) => (
                <HelpRequestRow
                  key={request.id}
                  request={request}
                  onDone={() => router.refresh()}
                  onError={setError}
                />
              ))
            )}
          </OpsCard>
        </section>

        <section style={{ marginTop: "1.5rem" }} aria-label="End-of-day notes">
          <OpsSectionHead label="End-of-day notes" count={data.wrapUps.length} />
          <OpsCard>
            {data.wrapUps.length === 0 ? (
              <p className="kxd-os-meta">No wrap-up notes yet.</p>
            ) : (
              data.wrapUps.map((wrap) => (
                <div key={wrap.id} className="kxd-os-ops-list-row">
                  <div className="kxd-os-ops-list-row__main">
                    <p className="kxd-os-ops-list-row__title">
                      {wrap.staffLabel} · {wrap.dateKey}
                    </p>
                    <p className="kxd-os-meta">{wrap.noteForMatt ?? "No note text."}</p>
                  </div>
                </div>
              ))
            )}
          </OpsCard>
        </section>

        <p className="kxd-os-meta" style={{ marginTop: "1.5rem" }}>
          <Link href="/admin/operations/staff" className="kxd-os-link-quiet">
            Open staff home
          </Link>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
