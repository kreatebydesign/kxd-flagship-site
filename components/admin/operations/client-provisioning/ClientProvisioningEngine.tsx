"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  PROVISIONING_ESTIMATE_TOTAL_SECONDS,
  PROVISIONING_STEPS,
  emptyProvisioningPayload,
  groupProvisioningModules,
  listProvisioningPackages,
  resolveModulesForPackage,
  validateProvisioningPayload,
} from "@/lib/client-provisioning";
import { normalizeClientSlug } from "@/lib/client-launch-wizard/validation/identity";
import type {
  ProvisionLogEntry,
  ProvisioningPackageId,
  ProvisioningPayload,
  ProvisioningResult,
} from "@/lib/client-provisioning/types";

const STEP_ORDER = PROVISIONING_STEPS.map((s) => s.id);

function formatEstimate(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `~${mins} min`;
}

export function ClientProvisioningEngine() {
  const packages = useMemo(() => listProvisioningPackages(), []);
  const moduleGroups = useMemo(() => groupProvisioningModules(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ProvisioningPayload>(() => emptyProvisioningPayload());
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<ProvisionLogEntry[]>([]);
  const [result, setResult] = useState<ProvisioningResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const stepId = STEP_ORDER[stepIndex] ?? "client";
  const progress = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100);

  const updateIdentity = useCallback(
    (patch: Partial<ProvisioningPayload["identity"]>) => {
      setDraft((prev) => {
        const identity = { ...prev.identity, ...patch };
        if (patch.companyName != null && !prev.identity.companySlug.trim()) {
          identity.companySlug = normalizeClientSlug(patch.companyName);
        }
        if (patch.previewWebsite != null) {
          return {
            ...prev,
            identity,
            infrastructure: {
              ...prev.infrastructure,
              previewWebsite: patch.previewWebsite,
            },
          };
        }
        if (patch.companyWebsite != null) {
          return {
            ...prev,
            identity,
            infrastructure: {
              ...prev.infrastructure,
              productionWebsite:
                prev.infrastructure.productionWebsite || patch.companyWebsite,
            },
          };
        }
        return { ...prev, identity };
      });
    },
    [],
  );

  async function checkUniqueness() {
    const params = new URLSearchParams({
      companyName: draft.identity.companyName,
      companySlug: draft.identity.companySlug || draft.identity.companyName,
      previewWebsite:
        draft.identity.previewWebsite || draft.infrastructure.previewWebsite,
    });
    const res = await fetch(`/api/admin/client-provisioning/uniqueness?${params}`, {
      credentials: "same-origin",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      slugTaken?: boolean;
      nameTaken?: boolean;
      previewTaken?: boolean;
      slug?: string;
    };
    if (!res.ok || !json.ok) {
      return { slugTaken: false, nameTaken: false, previewTaken: false };
    }
    if (json.slug && json.slug !== draft.identity.companySlug) {
      setDraft((prev) => ({
        ...prev,
        identity: { ...prev.identity, companySlug: json.slug || prev.identity.companySlug },
      }));
    }
    return {
      slugTaken: Boolean(json.slugTaken),
      nameTaken: Boolean(json.nameTaken),
      previewTaken: Boolean(json.previewTaken),
    };
  }

  async function goNext() {
    setIssues([]);
    setFailure(null);

    if (stepId === "client") {
      const uniqueness = await checkUniqueness();
      const found = validateProvisioningPayload(draft, uniqueness).filter(
        (i) => i.stepId === "client",
      );
      if (found.length) {
        setIssues(found.map((i) => i.message));
        return;
      }
    }

    if (stepId === "package" || stepId === "modules") {
      const found = validateProvisioningPayload(draft).filter(
        (i) => i.stepId === stepId,
      );
      if (found.length) {
        setIssues(found.map((i) => i.message));
        return;
      }
    }

    if (stepId === "portal") {
      const found = validateProvisioningPayload(draft).filter(
        (i) => i.stepId === "portal",
      );
      if (found.length) {
        setIssues(found.map((i) => i.message));
        return;
      }
    }

    if (stepIndex < STEP_ORDER.length - 1) {
      setStepIndex((n) => n + 1);
    }
  }

  function goBack() {
    setIssues([]);
    setFailure(null);
    setStepIndex((n) => Math.max(0, n - 1));
  }

  async function runProvision() {
    setBusy(true);
    setFailure(null);
    setLog([{ at: new Date().toISOString(), level: "info", message: "Starting provision…" }]);
    try {
      const uniqueness = await checkUniqueness();
      const allIssues = validateProvisioningPayload(draft, uniqueness);
      if (allIssues.length) {
        setIssues(allIssues.map((i) => i.message));
        setFailure(allIssues[0]!.message);
        setBusy(false);
        return;
      }

      const res = await fetch("/api/admin/client-provisioning/provision", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: draft }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        result?: ProvisioningResult & {
          success: boolean;
          failureSummary?: string;
          log?: ProvisionLogEntry[];
          rolledBack?: boolean;
        };
      };

      if (json.result?.log) setLog(json.result.log);

      if (!res.ok || !json.ok || !json.result || json.result.success !== true) {
        setFailure(
          json.result && "failureSummary" in json.result
            ? String(json.result.failureSummary)
            : json.message || "Provisioning failed.",
        );
        setBusy(false);
        return;
      }

      setResult(json.result);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Provisioning failed.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="kxd-provision">
        <header className="kxd-provision__hero">
          <p className="kxd-provision__eyebrow">Provisioning complete</p>
          <h1 className="kxd-provision__title">{result.clientName} is live</h1>
          <p className="kxd-provision__lead">
            Shared Core records are ready. Open the workspace, portal, or Website Review.
          </p>
        </header>

        <div className="kxd-provision__success-grid">
          <div className="kxd-os-card">
            <p className="kxd-os-metric__label">Client created</p>
            <p className="kxd-os-card__title">#{result.clientId} · {result.clientSlug}</p>
          </div>
          <div className="kxd-os-card">
            <p className="kxd-os-metric__label">Portal ready</p>
            <p className="kxd-os-card__title">
              {result.portalUsersCreated.length} seat
              {result.portalUsersCreated.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="kxd-os-card">
            <p className="kxd-os-metric__label">Modules enabled</p>
            <p className="kxd-os-card__title">{result.modulesEnabled.length}</p>
          </div>
          <div className="kxd-os-card">
            <p className="kxd-os-metric__label">Infrastructure</p>
            <p className="kxd-os-card__title">
              {result.infrastructureConfigured ? "Configured" : "—"}
            </p>
          </div>
          <div className="kxd-os-card">
            <p className="kxd-os-metric__label">Preview verified</p>
            <p className="kxd-os-card__title">
              {result.previewVerified == null
                ? result.previewConfigured
                  ? "Configured"
                  : "Not set"
                : result.previewVerified
                  ? "Reachable"
                  : "Needs attention"}
            </p>
          </div>
          <div className="kxd-os-card">
            <p className="kxd-os-metric__label">Website Review</p>
            <p className="kxd-os-card__title">
              {result.websiteReviewReady ? "Ready" : "Not entitled"}
            </p>
          </div>
        </div>

        <div className="kxd-os-card kxd-provision__urls">
          <p className="kxd-os-metric__label">Portal URL</p>
          <code className="kxd-os-ops-code">{result.portalUrl}</code>
          <p className="kxd-os-metric__label" style={{ marginTop: "1rem" }}>
            Admin URL
          </p>
          <code className="kxd-os-ops-code">{result.adminWorkspaceUrl}</code>
        </div>

        <div className="kxd-provision__actions">
          <a href={result.adminWorkspaceUrl} className="kxd-provision__primary">
            Open Client
          </a>
          <a
            href={result.portalUrl}
            className="kxd-provision__secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Portal
          </a>
          {result.websiteReviewReady ? (
            <a
              href={result.websiteReviewUrl}
              className="kxd-provision__secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Launch Website Review
            </a>
          ) : null}
          <Link href="/admin/operations/client-provisioning" className="kxd-os-link-quiet">
            Provision another
          </Link>
        </div>

        <ProvisionLogPanel entries={result.log} />
      </div>
    );
  }

  return (
    <div className="kxd-provision">
      <header className="kxd-provision__hero">
        <p className="kxd-provision__eyebrow">Client Provisioning Engine</p>
        <h1 className="kxd-provision__title">Provision a new client</h1>
        <p className="kxd-provision__lead">
          Create Shared Core records, entitlements, portal access, and infrastructure
          from one workflow. Launch Wizard remains the guided planning experience.
        </p>
      </header>

      <div className="kxd-provision__progress">
        <div className="kxd-provision__progress-meta">
          <span>
            Step {stepIndex + 1} of {STEP_ORDER.length} ·{" "}
            {PROVISIONING_STEPS[stepIndex]?.label}
          </span>
          <span>Estimated {formatEstimate(PROVISIONING_ESTIMATE_TOTAL_SECONDS)}</span>
        </div>
        <div className="kxd-provision__progress-track" aria-hidden>
          <div
            className="kxd-provision__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="kxd-provision__steps">
          {PROVISIONING_STEPS.map((step, idx) => (
            <li
              key={step.id}
              className={
                idx === stepIndex
                  ? "is-active"
                  : idx < stepIndex
                    ? "is-done"
                    : undefined
              }
            >
              {step.label}
            </li>
          ))}
        </ol>
      </div>

      <div className="kxd-provision__layout">
        <section className="kxd-os-card kxd-provision__main">
          {stepId === "client" ? (
            <ClientStep draft={draft} onChange={updateIdentity} />
          ) : null}

          {stepId === "package" ? (
            <PackageStep
              packageId={draft.packageId}
              packages={packages}
              onSelect={(packageId) =>
                setDraft((prev) => ({
                  ...prev,
                  packageId,
                  modules: resolveModulesForPackage(packageId, prev.modules),
                  automation: {
                    ...prev.automation,
                    reportingSchedule:
                      packageId === "starter" || packageId === "custom"
                        ? false
                        : true,
                  },
                }))
              }
            />
          ) : null}

          {stepId === "modules" ? (
            <ModulesStep
              groups={moduleGroups}
              selections={draft.modules}
              onToggle={(moduleId, enabled) =>
                setDraft((prev) => ({
                  ...prev,
                  modules: prev.modules.map((row) =>
                    row.moduleId === moduleId ? { ...row, enabled } : row,
                  ),
                }))
              }
            />
          ) : null}

          {stepId === "infrastructure" ? (
            <InfrastructureStep
              draft={draft}
              onChange={(infrastructure) =>
                setDraft((prev) => ({ ...prev, infrastructure }))
              }
            />
          ) : null}

          {stepId === "portal" ? (
            <PortalStep
              draft={draft}
              onChange={(portalSeats) => setDraft((prev) => ({ ...prev, portalSeats }))}
            />
          ) : null}

          {stepId === "automation" ? (
            <AutomationStep
              draft={draft}
              onChange={(automation) => setDraft((prev) => ({ ...prev, automation }))}
            />
          ) : null}

          {stepId === "provision" ? (
            <ProvisionStep
              draft={draft}
              busy={busy}
              failure={failure}
              log={log}
              onProvision={() => void runProvision()}
            />
          ) : null}

          {issues.length > 0 ? (
            <ul className="kxd-provision__issues">
              {issues.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          ) : null}

          {stepId !== "provision" ? (
            <div className="kxd-provision__nav">
              <button
                type="button"
                className="kxd-provision__secondary"
                disabled={stepIndex === 0}
                onClick={goBack}
              >
                Back
              </button>
              <button
                type="button"
                className="kxd-provision__primary"
                onClick={() => void goNext()}
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="kxd-provision__nav">
              <button
                type="button"
                className="kxd-provision__secondary"
                disabled={busy}
                onClick={goBack}
              >
                Back
              </button>
            </div>
          )}
        </section>

        <aside className="kxd-os-card kxd-provision__summary">
          <p className="kxd-os-section__label">Summary</p>
          <dl className="kxd-provision__summary-list">
            <div>
              <dt>Company</dt>
              <dd>{draft.identity.companyName || "—"}</dd>
            </div>
            <div>
              <dt>Slug</dt>
              <dd>
                <code className="kxd-os-ops-code">
                  {draft.identity.companySlug || "—"}
                </code>
              </dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>
                {packages.find((p) => p.id === draft.packageId)?.label ??
                  draft.packageId}
              </dd>
            </div>
            <div>
              <dt>Modules</dt>
              <dd>{draft.modules.filter((m) => m.enabled).length} enabled</dd>
            </div>
            <div>
              <dt>Preview</dt>
              <dd>
                {draft.identity.previewWebsite ||
                  draft.infrastructure.previewWebsite ||
                  "—"}
              </dd>
            </div>
            <div>
              <dt>Portal seats</dt>
              <dd>
                {draft.portalSeats.filter((s) => s.email.trim()).length}
              </dd>
            </div>
          </dl>
          <p className="kxd-os-meta" style={{ marginTop: "1.25rem" }}>
            Launch Wizard stays available for guided planning after provision.
          </p>
        </aside>
      </div>
    </div>
  );
}

function ClientStep({
  draft,
  onChange,
}: {
  draft: ProvisioningPayload;
  onChange: (patch: Partial<ProvisioningPayload["identity"]>) => void;
}) {
  const id = draft.identity;
  return (
    <div className="kxd-provision__fields">
      <h2>Client Information</h2>
      <label>
        Company Name
        <input
          value={id.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
        />
      </label>
      <label>
        Company Slug
        <input
          value={id.companySlug}
          onChange={(e) =>
            onChange({ companySlug: normalizeClientSlug(e.target.value) })
          }
        />
      </label>
      <label>
        Company Website
        <input
          value={id.companyWebsite}
          onChange={(e) => onChange({ companyWebsite: e.target.value })}
          placeholder="https://example.com"
        />
      </label>
      <label>
        Preview Website
        <input
          value={id.previewWebsite}
          onChange={(e) => onChange({ previewWebsite: e.target.value })}
          placeholder="https://client.preview.kreatebydesign.com"
        />
      </label>
      <label>
        Primary Contact
        <input
          value={id.primaryContact}
          onChange={(e) => onChange({ primaryContact: e.target.value })}
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={id.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </label>
      <label>
        Phone
        <input
          value={id.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </label>
      <label>
        Address
        <input
          value={id.address}
          onChange={(e) => onChange({ address: e.target.value })}
        />
      </label>
      <label>
        Industry
        <input
          value={id.industry}
          onChange={(e) => onChange({ industry: e.target.value })}
        />
      </label>
      <label>
        Client Status
        <select
          value={id.clientStatus}
          onChange={(e) =>
            onChange({
              clientStatus: e.target.value as ProvisioningPayload["identity"]["clientStatus"],
            })
          }
        >
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </label>
    </div>
  );
}

function PackageStep({
  packageId,
  packages,
  onSelect,
}: {
  packageId: ProvisioningPackageId;
  packages: ReturnType<typeof listProvisioningPackages>;
  onSelect: (id: ProvisioningPackageId) => void;
}) {
  return (
    <div className="kxd-provision__fields">
      <h2>Platform Package</h2>
      <p className="kxd-os-meta">
        Packages map to Shared Core entitlements — not hardcoded feature switches.
      </p>
      <div className="kxd-provision__package-grid">
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            className={`kxd-provision__package${packageId === pkg.id ? " is-selected" : ""}`}
            onClick={() => onSelect(pkg.id)}
          >
            <span className="kxd-provision__package-label">{pkg.label}</span>
            <span className="kxd-os-meta">{pkg.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModulesStep({
  groups,
  selections,
  onToggle,
}: {
  groups: ReturnType<typeof groupProvisioningModules>;
  selections: ProvisioningPayload["modules"];
  onToggle: (moduleId: string, enabled: boolean) => void;
}) {
  const map = new Map(selections.map((row) => [row.moduleId, row.enabled]));
  return (
    <div className="kxd-provision__fields">
      <h2>Modules</h2>
      {groups.map((group) => (
        <div key={group.category} className="kxd-provision__module-group">
          <p className="kxd-os-section__label">{group.label}</p>
          <div className="kxd-provision__module-list">
            {group.modules.map((mod) => (
              <label key={mod.id} className="kxd-provision__module-row">
                <input
                  type="checkbox"
                  checked={Boolean(map.get(mod.id))}
                  onChange={(e) => onToggle(mod.id, e.target.checked)}
                />
                <span>
                  <strong>
                    {mod.label}
                    {mod.planned ? " · Future" : ""}
                  </strong>
                  <span className="kxd-os-meta">{mod.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InfrastructureStep({
  draft,
  onChange,
}: {
  draft: ProvisioningPayload;
  onChange: (value: ProvisioningPayload["infrastructure"]) => void;
}) {
  const infra = draft.infrastructure;
  function patch(partial: Partial<ProvisioningPayload["infrastructure"]>) {
    onChange({ ...infra, ...partial });
  }
  return (
    <div className="kxd-provision__fields">
      <h2>Infrastructure</h2>
      <p className="kxd-os-meta">Everything optional. Preview Website uses Shared Core stagingUrl.</p>
      <label>
        Production Website
        <input
          value={infra.productionWebsite}
          onChange={(e) => patch({ productionWebsite: e.target.value })}
        />
      </label>
      <label>
        Preview Website
        <input
          value={infra.previewWebsite}
          onChange={(e) => patch({ previewWebsite: e.target.value })}
        />
      </label>
      <label>
        GA4 Property ID
        <input
          value={infra.ga4PropertyId}
          onChange={(e) => patch({ ga4PropertyId: e.target.value })}
        />
      </label>
      <label>
        Search Console Site URL
        <input
          value={infra.searchConsoleSiteUrl}
          onChange={(e) => patch({ searchConsoleSiteUrl: e.target.value })}
        />
      </label>
      <label>
        Reporting notes
        <textarea
          value={infra.reportingNotes}
          onChange={(e) => patch({ reportingNotes: e.target.value })}
          rows={2}
        />
      </label>
      <label>
        Google Calendar
        <input
          value={infra.googleCalendarNotes}
          onChange={(e) => patch({ googleCalendarNotes: e.target.value })}
          placeholder="Optional connection notes"
        />
      </label>
      <label>
        Google Drive
        <input
          value={infra.googleDriveNotes}
          onChange={(e) => patch({ googleDriveNotes: e.target.value })}
        />
      </label>
      <label>
        Blob
        <input
          value={infra.blobNotes}
          onChange={(e) => patch({ blobNotes: e.target.value })}
        />
      </label>
      <label>
        Resend
        <input
          value={infra.resendNotes}
          onChange={(e) => patch({ resendNotes: e.target.value })}
        />
      </label>
    </div>
  );
}

function PortalStep({
  draft,
  onChange,
}: {
  draft: ProvisioningPayload;
  onChange: (value: ProvisioningPayload["portalSeats"]) => void;
}) {
  const seats = draft.portalSeats;
  return (
    <div className="kxd-provision__fields">
      <h2>Portal</h2>
      <p className="kxd-os-meta">
        Creates portal-users linked to this client. Invite email delivery remains a follow-up.
      </p>
      {seats.map((seat, index) => (
        <div key={index} className="kxd-provision__seat">
          <label>
            Display name
            <input
              value={seat.displayName}
              onChange={(e) => {
                const next = [...seats];
                next[index] = { ...seat, displayName: e.target.value };
                onChange(next);
              }}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={seat.email}
              onChange={(e) => {
                const next = [...seats];
                next[index] = { ...seat, email: e.target.value };
                onChange(next);
              }}
            />
          </label>
          <label>
            Role
            <select
              value={seat.role}
              onChange={(e) => {
                const next = [...seats];
                next[index] = {
                  ...seat,
                  role: e.target.value as "owner" | "admin" | "member",
                };
                onChange(next);
              }}
            >
              <option value="owner">Client owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </label>
          <label className="kxd-provision__check">
            <input
              type="checkbox"
              checked={seat.sendInvite}
              onChange={(e) => {
                const next = [...seats];
                next[index] = { ...seat, sendInvite: e.target.checked };
                onChange(next);
              }}
            />
            Queue invite
          </label>
        </div>
      ))}
      <button
        type="button"
        className="kxd-os-link-quiet"
        onClick={() =>
          onChange([
            ...seats,
            { displayName: "", email: "", role: "member", sendInvite: true },
          ])
        }
      >
        + Add seat
      </button>
    </div>
  );
}

function AutomationStep({
  draft,
  onChange,
}: {
  draft: ProvisioningPayload;
  onChange: (value: ProvisioningPayload["automation"]) => void;
}) {
  const a = draft.automation;
  return (
    <div className="kxd-provision__fields">
      <h2>Automation</h2>
      <label className="kxd-provision__check">
        <input
          type="checkbox"
          checked={a.morningBrief}
          onChange={(e) => onChange({ ...a, morningBrief: e.target.checked })}
        />
        Morning Brief
      </label>
      <label className="kxd-provision__check">
        <input
          type="checkbox"
          checked={a.reportingSchedule}
          onChange={(e) => onChange({ ...a, reportingSchedule: e.target.checked })}
        />
        Reporting Schedule
      </label>
      <label className="kxd-provision__check">
        <input
          type="checkbox"
          checked={a.executiveRecommendations}
          onChange={(e) =>
            onChange({ ...a, executiveRecommendations: e.target.checked })
          }
        />
        Executive Recommendations
      </label>
      <label className="kxd-provision__check">
        <input
          type="checkbox"
          checked={a.notifications}
          onChange={(e) => onChange({ ...a, notifications: e.target.checked })}
        />
        Notifications
      </label>
      <label>
        Reporting sync hour (Pacific)
        <input
          type="number"
          min={0}
          max={23}
          value={a.reportingSyncHourPacific}
          onChange={(e) =>
            onChange({
              ...a,
              reportingSyncHourPacific: Number(e.target.value),
            })
          }
        />
      </label>
    </div>
  );
}

function ProvisionStep({
  draft,
  busy,
  failure,
  log,
  onProvision,
}: {
  draft: ProvisioningPayload;
  busy: boolean;
  failure: string | null;
  log: ProvisionLogEntry[];
  onProvision: () => void;
}) {
  return (
    <div className="kxd-provision__fields">
      <h2>Provision</h2>
      <p className="kxd-os-meta">
        This creates Client, Infrastructure, Executive Profile, CES entitlements, portal
        users, and timeline records. Partial failure rolls back safely.
      </p>
      <ul className="kxd-provision__checklist">
        <li>{draft.identity.companyName || "Client"} · {draft.identity.companySlug}</li>
        <li>Package: {draft.packageId}</li>
        <li>{draft.modules.filter((m) => m.enabled).length} modules enabled</li>
        <li>
          {draft.portalSeats.filter((s) => s.email.trim()).length} portal seat(s)
        </li>
      </ul>
      {failure ? <p className="kxd-provision__failure">{failure}</p> : null}
      <button
        type="button"
        className="kxd-provision__primary"
        disabled={busy}
        onClick={onProvision}
      >
        {busy ? "Provisioning…" : "Provision client"}
      </button>
      <ProvisionLogPanel entries={log} />
    </div>
  );
}

function ProvisionLogPanel({ entries }: { entries: ProvisionLogEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="kxd-provision__log">
      <p className="kxd-os-section__label">Provision log</p>
      <ul>
        {entries.map((entry, idx) => (
          <li key={`${entry.at}-${idx}`} data-level={entry.level}>
            <time dateTime={entry.at}>
              {new Date(entry.at).toLocaleTimeString()}
            </time>{" "}
            {entry.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
