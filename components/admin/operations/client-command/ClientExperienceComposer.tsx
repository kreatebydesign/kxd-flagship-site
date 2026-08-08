"use client";

import { useEffect, useMemo, useState } from "react";
import { PortalPreviewQuickAction } from "./PortalPreviewQuickAction";
import type {
  ExperienceDependency,
  ExperienceDiscoverKind,
  ExperienceRecommendation,
} from "@/lib/client-command/experience/composer/types";
import type { OperatorExperienceSnapshot } from "@/lib/client-command/experience/types";
import type {
  ResolvedServiceScope,
  ServiceCapabilityDefinition,
  ServiceCapabilityId,
} from "@/lib/service-capabilities";

type RecommendResponse = {
  ok?: boolean;
  message?: string;
  recommendation?: ExperienceRecommendation;
};

type ActivateResponse = {
  ok?: boolean;
  message?: string;
  experience?: OperatorExperienceSnapshot;
};

type ProvisionResponse = {
  ok?: boolean;
  message?: string;
};

type ServicesResponse = {
  ok?: boolean;
  message?: string;
  catalog?: ServiceCapabilityDefinition[];
  scope?: ResolvedServiceScope;
};

type DiscoverResponse = {
  ok?: boolean;
  message?: string;
  branding?: {
    siteUrl?: string | null;
    displayName?: { name: string; source: string; confidence: string } | null;
    logos?: Array<{ url: string; source: string; confidence: string }>;
    colors?: Array<{ hex: string; role: string; source: string; confidence: string }>;
    message?: string;
  } | null;
  ga4?: {
    capability?: { possible?: boolean; message?: string; missing?: string | null };
    siteMeasurementIds?: string[];
    candidates?: Array<{
      propertyId: string;
      displayName: string;
      confidence: string;
      reason: string;
      importable: boolean;
    }>;
  } | null;
  searchConsole?: {
    capability?: { possible?: boolean; message?: string; missing?: string | null };
    proposedSiteUrl?: string | null;
    candidates?: Array<{
      siteUrl: string;
      state: string;
      permissionLevel?: string | null;
      confidence: string;
      reason: string;
      importable: boolean;
    }>;
  } | null;
};

function decisionLabel(decision: string): string {
  if (decision === "include") return "Ready";
  if (decision === "needs-setup") return "Needs setup";
  if (decision === "always") return "Always on";
  if (decision === "gated") return "Gated";
  if (decision === "locked") return "Not available";
  return "Not included";
}

function classLabel(value: ExperienceDependency["resolutionClass"]): string {
  if (value === "satisfied") return "Satisfied";
  if (value === "auto-resolvable") return "Auto-resolvable";
  if (value === "actionable") return "Actionable";
  return "External";
}

export function ClientExperienceComposer({
  clientId,
  onActivated,
}: {
  clientId: number;
  onActivated: (experience: OperatorExperienceSnapshot) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [serviceBusy, setServiceBusy] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<ServiceCapabilityDefinition[]>([]);
  const [scope, setScope] = useState<ResolvedServiceScope | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState<ExperienceDiscoverKind | null>(null);
  const [discoveries, setDiscoveries] = useState<Partial<Record<ExperienceDiscoverKind, DiscoverResponse>>>({});
  const [selectedColors, setSelectedColors] = useState<{
    primary: string;
    secondary: string;
    accent: string;
  }>({ primary: "", secondary: "", accent: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<ExperienceRecommendation | null>(
    null,
  );
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  async function loadServices() {
    const res = await fetch(`/api/admin/clients/${clientId}/experience/services`, {
      credentials: "same-origin",
    });
    const json = (await res.json()) as ServicesResponse;
    if (!res.ok || !json.ok || !json.scope || !json.catalog) {
      throw new Error(json.message || "Unable to load commercial services.");
    }
    setCatalog(json.catalog);
    setScope(json.scope);
    return json.scope;
  }

  async function generate(options?: { preserveFeedback?: boolean }) {
    setGenerating(true);
    if (!options?.preserveFeedback) {
      setError(null);
      setNotice(null);
    }
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/experience/recommend`, {
        credentials: "same-origin",
      });
      const json = (await res.json()) as RecommendResponse;
      if (!res.ok || !json.ok || !json.recommendation) {
        throw new Error(json.message || "Unable to generate recommendation.");
      }
      const rec = json.recommendation;
      setRecommendation(rec);
      setAccepted(new Set(rec.activationModules));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate recommendation.");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadServices();
        await generate({ preserveFeedback: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to compose experience.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial commercial review load
  }, [clientId]);

  async function updateService(action: "activate" | "end", capabilityId: ServiceCapabilityId) {
    setServiceBusy(capabilityId);
    setError(null);
    try {
      const active = scope?.assignments.find(
        (row) => row.capabilityId === capabilityId && row.status === "active",
      );
      const res = await fetch(`/api/admin/clients/${clientId}/experience/services`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "activate"
            ? {
                action: "activate",
                capabilityId,
                source: catalog.find((row) => row.id === capabilityId)?.kind === "add-on"
                  ? "add-on"
                  : "legacy-manual",
              }
            : { action: "end", assignmentId: active?.id },
        ),
      });
      const json = (await res.json()) as ServicesResponse;
      if (!res.ok || !json.ok || !json.scope) {
        throw new Error(json.message || "Unable to update services.");
      }
      setScope(json.scope);
      if (json.catalog) setCatalog(json.catalog);
      setNotice(
        action === "activate"
          ? "Active services updated. Experience recomposed — Approve & Activate still required."
          : "Service ended. Historical assignment kept. Experience recomposed.",
      );
      await generate({ preserveFeedback: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update services.");
    } finally {
      setServiceBusy(null);
    }
  }

  function toggleAccepted(id: string, on: boolean) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const draftComposition = useMemo(() => {
    if (!recommendation) return undefined;
    return {
      modules: [...accepted],
      branding: {
        clientName: recommendation.branding.clientName,
        portalSidebarLabel: recommendation.branding.portalSidebarLabel,
        welcomeEyebrow: recommendation.branding.welcomeEyebrow,
        reassuranceLine: recommendation.branding.reassuranceLine,
        supportTone: recommendation.branding.supportTone,
        primaryColor: recommendation.branding.primaryColor,
        secondaryColor: recommendation.branding.secondaryColor,
        accentColor: recommendation.branding.accentColor,
      },
    };
  }, [accepted, recommendation]);

  const liveReadiness = useMemo(() => {
    if (!recommendation) return null;
    const blockers: string[] = [];
    const logoOk = recommendation.branding.logoHasFile;
    const colorsOk = recommendation.branding.colorSource === "authoritative";
    if (!logoOk) blockers.push("Add a client logo before activating a client-facing experience.");
    if (!colorsOk) {
      blockers.push("Store a trusted client brand color before activating. Do not ship KXD gold.");
    }
    const ga4 = recommendation.readiness.dependencies.find((d) => d.id === "ga4");
    const gsc = recommendation.readiness.dependencies.find((d) => d.id === "search-console");
    const inventory = recommendation.readiness.dependencies.find((d) => d.id === "inventory");
    const reports = recommendation.readiness.dependencies.find((d) => d.id === "reports");
    if (accepted.has("analytics") && ga4?.status !== "satisfied") {
      blockers.push("Analytics cannot activate until a GA4 property ID is stored on infrastructure.");
    }
    if (
      accepted.has("website-health") &&
      gsc?.status !== "satisfied" &&
      ga4?.status !== "satisfied"
    ) {
      blockers.push(
        "Website Health cannot activate until Search Console or GA4 is stored on infrastructure.",
      );
    }
    if (accepted.has("inventory") && inventory?.status !== "satisfied") {
      blockers.push("Inventory cannot activate until at least one listing exists in KXD OS.");
    }
    if (accepted.has("reports") && reports?.status !== "satisfied") {
      blockers.push("Reports cannot activate until a published client report exists.");
    }
    return {
      activationEligible: blockers.length === 0,
      activationBlockers: blockers,
    };
  }, [accepted, recommendation]);

  async function provision(actionId: string, candidateValue?: string) {
    if (!actionId || provisioning) return;
    setProvisioning(actionId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/experience/provision`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, candidateValue }),
      });
      let json: ProvisionResponse;
      try {
        json = (await res.json()) as ProvisionResponse;
      } catch {
        throw new Error(
          res.ok
            ? "Import returned an unreadable response."
            : `Import failed (${res.status}). Nothing was saved.`,
        );
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.message || `Import failed (${res.status}). Nothing was saved.`);
      }
      setNotice(json.message || "Import complete.");
      await generate({ preserveFeedback: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply provisioning action.");
      setNotice(null);
    } finally {
      setProvisioning(null);
    }
  }

  async function discover(kind: ExperienceDiscoverKind) {
    if (discovering) return;
    setDiscovering(kind);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/admin/clients/${clientId}/experience/discover?kind=${encodeURIComponent(kind)}`,
        { credentials: "same-origin" },
      );
      const json = (await res.json()) as DiscoverResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Unable to discover candidates.");
      }
      setDiscoveries((prev) => ({ ...prev, [kind]: json }));
      const firstAccent = json.branding?.colors?.find((c) => c.role === "accent")?.hex;
      const firstPrimary = json.branding?.colors?.find((c) => c.role === "primary")?.hex;
      const firstSecondary = json.branding?.colors?.find((c) => c.role === "secondary")?.hex;
      if (kind === "branding") {
        setSelectedColors({
          primary: firstPrimary || json.branding?.colors?.[0]?.hex || "",
          secondary: firstSecondary || json.branding?.colors?.[1]?.hex || "",
          accent: firstAccent || json.branding?.colors?.[2]?.hex || json.branding?.colors?.[0]?.hex || "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to discover candidates.");
    } finally {
      setDiscovering(null);
    }
  }

  async function activate() {
    if (!recommendation || activating) return;
    if (liveReadiness && !liveReadiness.activationEligible) return;
    setActivating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/experience/activate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptedModules: [...accepted],
          branding: recommendation.branding,
        }),
      });
      const json = (await res.json()) as ActivateResponse;
      if (!res.ok || !json.ok || !json.experience) {
        throw new Error(json.message || "Unable to activate experience.");
      }
      onActivated(json.experience);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to activate experience.");
    } finally {
      setActivating(false);
    }
  }

  const grouped = useMemo(() => {
    const rec = recommendation?.modules ?? [];
    return {
      recommended: rec.filter(
        (m) => m.decision === "include" || m.decision === "always" || m.decision === "needs-setup",
      ),
      needsSetup: rec.filter((m) => m.decision === "needs-setup"),
      gated: rec.filter((m) => m.decision === "gated"),
      excluded: rec.filter((m) => m.decision === "exclude" || m.decision === "locked"),
    };
  }, [recommendation]);

  const setupDeps =
    recommendation?.readiness.dependencies.filter(
      (dep) => dep.status === "unresolved" && dep.id !== "access",
    ) ?? [];
  const accessDep = recommendation?.readiness.dependencies.find((dep) => dep.id === "access");

  return (
    <section className="kxd-os-card kxd-ces-exp kxd-ces-composer">
      <div className="kxd-plans-access__head">
        <div>
          <p className="kxd-os-section__label">Client Experience</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            Commercial services compose the workspace. Integrations affect readiness, not
            entitlement. Preview anytime. Approve & Activate stays explicit. Invite stays on
            Manage Portal Access.
          </p>
        </div>
        {recommendation ? (
          <span className="kxd-plans-access__badge kxd-plans-access__badge--active">
            Readiness {recommendation.readinessPercent}%
          </span>
        ) : null}
      </div>

      {scope?.relationshipLabel ? (
        <p className="kxd-os-meta">Commercial relationship · {scope.relationshipLabel}</p>
      ) : null}

      {recommendation ? (
        <p className="kxd-os-meta">
          Modules ready {recommendation.counts.ready}/{recommendation.counts.recommended} ·
          Needs setup {recommendation.counts.needsSetup} · Shell{" "}
          {recommendation.homeShell === "ces" ? "CES" : "Client HQ"}
        </p>
      ) : null}

      {error ? (
        <p className="kxd-os-meta kxd-ces-exp__error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="kxd-os-meta kxd-ces-exp__notice" role="status">
          {notice}
        </p>
      ) : null}

      <h3 className="kxd-ces-exp__h">Active services</h3>
      <ul className="kxd-ces-exp__modules">
        {catalog
          .filter((entry) => entry.kind !== "add-on")
          .map((entry) => {
            const active = scope?.assignments.some(
              (row) => row.capabilityId === entry.id && row.status === "active",
            );
            return (
              <li key={entry.id} className="kxd-ces-exp__module">
                <label className="kxd-ces-exp__check">
                  <input
                    type="checkbox"
                    checked={Boolean(active)}
                    disabled={Boolean(serviceBusy) || generating}
                    onChange={(e) =>
                      void updateService(e.target.checked ? "activate" : "end", entry.id)
                    }
                  />
                  <span>
                    <strong>{entry.label}</strong>
                    <span className="kxd-os-meta">
                      {" "}
                      · {entry.kind === "performance" ? "Commercial only" : entry.kind}
                    </span>
                  </span>
                </label>
                <div className="kxd-ces-exp__module-meta">
                  <span className="kxd-os-meta">{entry.summary}</span>
                </div>
              </li>
            );
          })}
      </ul>

      <h3 className="kxd-ces-exp__h">Optional / available add-ons</h3>
      <ul className="kxd-ces-exp__modules">
        {catalog
          .filter((entry) => entry.kind === "add-on")
          .map((entry) => {
            const active = scope?.assignments.some(
              (row) => row.capabilityId === entry.id && row.status === "active",
            );
            return (
              <li key={entry.id} className="kxd-ces-exp__module">
                <label className="kxd-ces-exp__check">
                  <input
                    type="checkbox"
                    checked={Boolean(active)}
                    disabled={Boolean(serviceBusy) || generating}
                    onChange={(e) =>
                      void updateService(e.target.checked ? "activate" : "end", entry.id)
                    }
                  />
                  <span>
                    <strong>{entry.label}</strong>
                  </span>
                </label>
                <div className="kxd-ces-exp__module-meta">
                  <span className="kxd-os-meta">{entry.summary}</span>
                </div>
              </li>
            );
          })}
      </ul>

      {recommendation ? (
        <>
          {recommendation.notes.length ? (
            <ul className="kxd-ces-exp__warnings">
              {recommendation.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}

          <h3 className="kxd-ces-exp__h">Client Experience</h3>
          <ul className="kxd-ces-exp__modules">
            {grouped.recommended.map((row) => (
              <li key={row.id} className="kxd-ces-exp__module">
                <label className="kxd-ces-exp__check">
                  <input
                    type="checkbox"
                    checked={row.decision === "always" || accepted.has(row.id)}
                    disabled={activating || row.decision === "always"}
                    onChange={(e) => toggleAccepted(row.id, e.target.checked)}
                  />
                  <span>
                    <strong>{row.label}</strong>
                    <span className="kxd-os-meta"> {decisionLabel(row.decision)}</span>
                  </span>
                </label>
                <div className="kxd-ces-exp__module-meta">
                  <span className="kxd-os-meta">{row.reason}</span>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="kxd-ces-exp__h">Branding</h3>
          <p className="kxd-os-meta">
            {recommendation.branding.clientName} · Logo:{" "}
            {recommendation.branding.logoHasFile ? "On file" : "Missing"} · Colors:{" "}
            {recommendation.branding.colorSource === "authoritative"
              ? "Complete"
              : "Incomplete"}
            . {recommendation.branding.colorNote}
          </p>

          <h3 className="kxd-ces-exp__h">Integrations</h3>
          <ul className="kxd-plans-access__list kxd-plans-access__list--effective">
            {recommendation.integrations.slice(0, 6).map((row) => (
              <li key={row.id}>
                {row.label}
                <span>{row.status === "configured" ? "Connected" : row.detail || row.status}</span>
              </li>
            ))}
          </ul>

          <h3 className="kxd-ces-exp__h">Access</h3>
          <p className="kxd-os-meta">
            {accessDep?.reason ??
              `Memberships: ${recommendation.portalAccess.activeMembershipCount}. Invites stay on Manage Portal Access.`}
          </p>

          <details
            className="kxd-ces-exp__advanced"
            open={advancedOpen}
            onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary>Advanced Configuration</summary>
            <p className="kxd-os-meta">
              Discovery, per-dependency provisioning, and manual module review. Not the normal
              commercial workflow.
            </p>
            <div className="kxd-plans-access__actions">
              <button
                type="button"
                className="kxd-os-link-quiet"
                disabled={generating}
                onClick={() => void generate()}
              >
                {generating ? "Analyzing…" : "Regenerate from current truth"}
              </button>
              <a
                className="kxd-os-link-quiet"
                href={`/admin/operations/client-command/${clientId}?tab=experience`}
              >
                Manage Experience
              </a>
            </div>
          {setupDeps.length ? (
            <>
              <h3 className="kxd-ces-exp__h">Needs Setup</h3>
              <ul className="kxd-ces-exp__modules">
                {setupDeps.map((dep) => (
                  <li key={dep.id} className="kxd-ces-exp__module">
                    <div className="kxd-ces-exp__dep-head">
                      <strong>{dep.label}</strong>
                      <span className="kxd-ces-exp__state kxd-ces-exp__state--ineligible">
                        {dep.launchImpact === "blocking" ? "Blocking" : "Optional"} ·{" "}
                        {classLabel(dep.resolutionClass)}
                      </span>
                    </div>
                    <div className="kxd-ces-exp__module-meta">
                      <span className="kxd-os-meta">{dep.reason}</span>
                      <span className="kxd-os-meta">Owner: {dep.ownerSystem}</span>
                    </div>
                    <div className="kxd-plans-access__actions">
                      {dep.provision.kind === "apply-discovered" && dep.provision.actionId ? (
                        <button
                          type="button"
                          className="kxd-plans-access__save"
                          disabled={Boolean(provisioning)}
                          onClick={() => void provision(dep.provision.actionId!)}
                        >
                          {provisioning === dep.provision.actionId ? "Applying…" : dep.provision.label}
                        </button>
                      ) : null}
                      {dep.provision.kind === "discover" && dep.provision.discoverKind ? (
                        <button
                          type="button"
                          className="kxd-plans-access__save"
                          disabled={Boolean(discovering)}
                          onClick={() => void discover(dep.provision.discoverKind!)}
                        >
                          {discovering === dep.provision.discoverKind
                            ? "Discovering…"
                            : dep.provision.label}
                        </button>
                      ) : null}
                      {dep.provision.href ? (
                        <a className="kxd-os-link-quiet" href={dep.provision.href}>
                          {dep.provision.kind === "discover" || dep.provision.kind === "apply-discovered"
                            ? "Open owning system"
                            : dep.provision.label || "Open owning system"}
                        </a>
                      ) : null}
                    </div>
                    {dep.provision.discoverKind && discoveries[dep.provision.discoverKind] ? (
                      <DiscoveryCandidates
                        depId={dep.id}
                        discovery={discoveries[dep.provision.discoverKind]!}
                        selectedColors={selectedColors}
                        onSelectColor={(role, hex) =>
                          setSelectedColors((prev) => ({ ...prev, [role]: hex }))
                        }
                        provisioning={provisioning}
                        onImportLogo={(url) => void provision("import-branding-logo", url)}
                        onImportColors={() =>
                          void provision("import-branding-colors", JSON.stringify(selectedColors))
                        }
                        onUseGa4={(propertyId) =>
                          void provision("apply-discovered-ga4-property", propertyId)
                        }
                        onUseGsc={(siteUrl) =>
                          void provision("apply-search-console-site-url", siteUrl)
                        }
                      />
                    ) : null}
                    {dep.relatedModules.some((id) =>
                      grouped.needsSetup.some((row) => row.id === id),
                    )
                      ? grouped.needsSetup
                          .filter((row) => dep.relatedModules.includes(row.id))
                          .map((row) => (
                            <label key={row.id} className="kxd-ces-exp__check">
                              <input
                                type="checkbox"
                                checked={accepted.has(row.id)}
                                disabled={activating}
                                onChange={(e) => toggleAccepted(row.id, e.target.checked)}
                              />
                              <span>
                                Include {row.label} after setup
                              </span>
                            </label>
                          ))
                      : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h3 className="kxd-ces-exp__h">Not Included</h3>
          <ul className="kxd-plans-access__list kxd-plans-access__list--effective">
            {[...grouped.gated, ...grouped.excluded].map((row) => (
              <li key={row.id}>
                {row.label}
                <span>
                  {decisionLabel(row.decision)} — {row.reason}
                </span>
              </li>
            ))}
          </ul>

          <h3 className="kxd-ces-exp__h">Effective navigation (proposed)</h3>
          {recommendation.navPreview.map((group) => (
            <div key={group.label} className="kxd-ces-exp__nav-group">
              <p className="kxd-os-section__label">{group.label}</p>
              <ul className="kxd-plans-access__list">
                {group.items.map((item) => (
                  <li key={item.id}>
                    {item.label}
                    <span>{item.href}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          </details>

          {liveReadiness && !liveReadiness.activationEligible ? (
            <ul className="kxd-ces-exp__warnings">
              {liveReadiness.activationBlockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}

          <div className="kxd-plans-access__actions">
            <PortalPreviewQuickAction
              clientId={clientId}
              label="Preview Experience"
              draftComposition={draftComposition}
            />
            <button
              type="button"
              className="kxd-plans-access__save"
              disabled={
                activating || Boolean(liveReadiness && !liveReadiness.activationEligible)
              }
              onClick={() => void activate()}
            >
              {activating ? "Activating…" : "Approve & Activate"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function DiscoveryCandidates({
  depId,
  discovery,
  selectedColors,
  onSelectColor,
  provisioning,
  onImportLogo,
  onImportColors,
  onUseGa4,
  onUseGsc,
}: {
  depId: string;
  discovery: DiscoverResponse;
  selectedColors: { primary: string; secondary: string; accent: string };
  onSelectColor: (role: "primary" | "secondary" | "accent", hex: string) => void;
  provisioning: string | null;
  onImportLogo: (url: string) => void;
  onImportColors: () => void;
  onUseGa4: (propertyId: string) => void;
  onUseGsc: (siteUrl: string) => void;
}) {
  if (depId === "logo" || depId === "brand-colors") {
    const branding = discovery.branding;
    if (!branding) return null;
    return (
      <div className="kxd-ces-exp__discover">
        <p className="kxd-os-meta">
          Source {branding.siteUrl || "unknown"} · {branding.message}
        </p>
        {branding.displayName ? (
          <p className="kxd-os-meta">
            Display name candidate: {branding.displayName.name} ({branding.displayName.source},{" "}
            {branding.displayName.confidence})
          </p>
        ) : null}
        {depId === "logo"
          ? (branding.logos ?? []).map((logo) => (
              <div key={logo.url} className="kxd-ces-exp__candidate">
                <span>
                  {logo.url}
                  <span className="kxd-os-meta">
                    {" "}
                    · {logo.source} · {logo.confidence}
                  </span>
                </span>
                <button
                  type="button"
                  className="kxd-os-link-quiet"
                  disabled={Boolean(provisioning)}
                  onClick={() => onImportLogo(logo.url)}
                >
                  {provisioning === "import-branding-logo" ? "Importing…" : "Import This Logo"}
                </button>
              </div>
            ))
          : null}
        {depId === "brand-colors" ? (
          <>
            {(branding.colors ?? []).map((color) => (
              <div key={`${color.hex}-${color.role}`} className="kxd-ces-exp__candidate">
                <span>
                  {color.hex}
                  <span className="kxd-os-meta">
                    {" "}
                    · {color.role} · {color.source} · {color.confidence}
                  </span>
                </span>
                <span className="kxd-ces-exp__candidate-actions">
                  <button type="button" className="kxd-os-link-quiet" onClick={() => onSelectColor("primary", color.hex)}>
                    Primary
                  </button>
                  <button type="button" className="kxd-os-link-quiet" onClick={() => onSelectColor("secondary", color.hex)}>
                    Secondary
                  </button>
                  <button type="button" className="kxd-os-link-quiet" onClick={() => onSelectColor("accent", color.hex)}>
                    Accent
                  </button>
                </span>
              </div>
            ))}
            {branding.colors?.length ? (
              <div className="kxd-plans-access__actions">
                <span className="kxd-os-meta">
                  Selected {selectedColors.primary} / {selectedColors.secondary} / {selectedColors.accent}
                </span>
                <button
                  type="button"
                  className="kxd-plans-access__save"
                  disabled={Boolean(provisioning) || !selectedColors.primary}
                  onClick={onImportColors}
                >
                  {provisioning === "import-branding-colors" ? "Importing…" : "Import Selected Colors"}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  if (depId === "ga4") {
    const ga4 = discovery.ga4;
    if (!ga4) return null;
    return (
      <div className="kxd-ces-exp__discover">
        <p className="kxd-os-meta">{ga4.capability?.message}</p>
        {ga4.capability?.missing ? <p className="kxd-os-meta">Missing: {ga4.capability.missing}</p> : null}
        {ga4.siteMeasurementIds?.length ? (
          <p className="kxd-os-meta">
            Website measurement ID{ga4.siteMeasurementIds.length === 1 ? "" : "s"}{" "}
            {ga4.siteMeasurementIds.join(", ")} — not a property ID.
          </p>
        ) : null}
        {(ga4.candidates ?? []).map((row) => (
          <div key={row.propertyId} className="kxd-ces-exp__candidate">
            <span>
              {row.displayName} · {row.propertyId}
              <span className="kxd-os-meta">
                {" "}
                · {row.confidence} · {row.reason}
              </span>
            </span>
            {row.importable ? (
              <button
                type="button"
                className="kxd-os-link-quiet"
                disabled={Boolean(provisioning)}
                onClick={() => onUseGa4(row.propertyId)}
              >
                Use This Property
              </button>
            ) : (
              <span className="kxd-os-meta">Not confirmed for this site</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (depId === "search-console") {
    const gsc = discovery.searchConsole;
    if (!gsc) return null;
    return (
      <div className="kxd-ces-exp__discover">
        <p className="kxd-os-meta">{gsc.capability?.message}</p>
        {gsc.capability?.missing ? <p className="kxd-os-meta">Missing: {gsc.capability.missing}</p> : null}
        {(gsc.candidates ?? []).map((row) => (
          <div key={row.siteUrl} className="kxd-ces-exp__candidate">
            <span>
              {row.siteUrl}
              <span className="kxd-os-meta">
                {" "}
                · {row.state.replace(/_/g, " ")} · {row.confidence} · {row.reason}
              </span>
            </span>
            {row.importable ? (
              <button
                type="button"
                className="kxd-os-link-quiet"
                disabled={Boolean(provisioning)}
                onClick={() => onUseGsc(row.siteUrl)}
              >
                Use This Property
              </button>
            ) : (
              <span className="kxd-os-meta">Not verified for connected account</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
