"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalPreviewQuickAction } from "./PortalPreviewQuickAction";
import { ClientExperienceComposer } from "./ClientExperienceComposer";
import {
  composeOperatorHomeShell,
  composeOperatorModuleRows,
  composeOperatorNavPreview,
} from "@/lib/client-command/experience/compose";
import { composeOperatorExperienceWarnings } from "@/lib/client-command/experience/warnings";
import { OPERATOR_TERMINOLOGY_KEYS } from "@/lib/client-command/experience/types";
import type {
  OperatorExperienceSnapshot,
  OperatorExperienceSaveInput,
} from "@/lib/client-command/experience/types";

type ApiResponse = {
  ok?: boolean;
  message?: string;
  experience?: OperatorExperienceSnapshot;
};

const TERMINOLOGY_LABELS: Record<(typeof OPERATOR_TERMINOLOGY_KEYS)[number], string> = {
  "nav.website-review": "Nav · Website Review",
  "nav.website-workspace": "Nav · Website Workspace",
  "nav.inventory": "Nav · Inventory",
  "nav.executive-review": "Nav · Executive Review",
  "nav.executive-performance": "Nav · Partnership",
};

function effectiveClass(state: string): string {
  if (state === "visible") return "kxd-ces-exp__state kxd-ces-exp__state--visible";
  if (state === "ineligible") return "kxd-ces-exp__state kxd-ces-exp__state--ineligible";
  if (state === "not-available") return "kxd-ces-exp__state kxd-ces-exp__state--locked";
  return "kxd-ces-exp__state";
}

export function ClientExperiencePanel({ clientId }: { clientId: number }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<OperatorExperienceSnapshot | null>(null);
  const [form, setForm] = useState<OperatorExperienceSaveInput | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/experience`, {
        credentials: "same-origin",
      });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || !json.ok || !json.experience) {
        throw new Error(json.message || "Unable to load experience.");
      }
      const exp = json.experience;
      setSnapshot(exp);
      setForm({
        profileStatus:
          exp.profileStatus === "none" ? "draft" : exp.profileStatus,
        clientName: exp.branding.clientName,
        portalSidebarLabel: exp.branding.portalSidebarLabel,
        welcomeEyebrow: exp.branding.welcomeEyebrow,
        reassuranceLine: exp.branding.reassuranceLine,
        supportTone: exp.branding.supportTone,
        primaryColor: exp.branding.primaryColor,
        secondaryColor: exp.branding.secondaryColor,
        accentColor: exp.branding.accentColor,
        borderRadiusPreset: exp.branding.borderRadiusPreset,
        motionPreset: exp.branding.motionPreset,
        showKxdPartnerMark: exp.branding.showKxdPartnerMark,
        partnerFooterLine: exp.branding.partnerFooterLine,
        terminology: { ...exp.branding.terminology },
        selectedPortalModules: [...exp.selectedPortalModules],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load experience.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    // Initial + clientId-scoped fetch (admin session).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async bootstrap load
    void load();
  }, [load]);

  const selectedSet = useMemo(
    () => new Set(form?.selectedPortalModules ?? []),
    [form?.selectedPortalModules],
  );

  const draft = useMemo(() => {
    if (!form || !snapshot) return null;
    const input = {
      clientId: snapshot.clientId,
      clientName: form.clientName,
      clientSlug: snapshot.clientSlug,
      profileStatus: form.profileStatus,
      selectedPortalModules: form.selectedPortalModules,
      reportingCapabilities: snapshot.reportingCapabilities,
      entitlements: snapshot.plan,
      billingNavAvailable: snapshot.billingNavAvailable,
      portfolioNavAvailable: snapshot.portfolioNavAvailable,
      websiteUrl: snapshot.websiteUrl,
      logoUrl: snapshot.logo.url,
      visual: {
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        accentColor: form.accentColor,
        borderRadiusPreset: form.borderRadiusPreset,
        motionPreset: form.motionPreset,
      },
      hospitality: {
        welcomeEyebrow: form.welcomeEyebrow,
        reassuranceLine: form.reassuranceLine,
        supportTone: form.supportTone,
        portalSidebarLabel: form.portalSidebarLabel,
        partnerFooterLine: form.partnerFooterLine,
        showPartnerMark: form.showKxdPartnerMark,
      },
      terminology: form.terminology,
    };
    return {
      modules: composeOperatorModuleRows(input),
      navPreview: composeOperatorNavPreview(input),
      homeShell: composeOperatorHomeShell(input),
      warnings: composeOperatorExperienceWarnings({
        hasLogo: snapshot.logo.hasLogo,
        profileStatus: form.profileStatus,
        selectedPortalModules: form.selectedPortalModules,
        welcomeEyebrow: form.welcomeEyebrow,
        reassuranceLine: form.reassuranceLine,
        accentColor: form.accentColor,
        hasPortalMembership: snapshot.portalAccess.hasPortalMembership,
        inventoryRecordCount: snapshot.inventoryRecordCount,
        integrations: snapshot.integrations,
      }),
    };
  }, [form, snapshot]);

  function toggleModule(id: string, on: boolean) {
    if (!form) return;
    const next = new Set(form.selectedPortalModules);
    if (on) next.add(id);
    else next.delete(id);
    setForm({ ...form, selectedPortalModules: [...next] });
  }

  async function save() {
    if (!form || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/experience`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || !json.ok || !json.experience) {
        throw new Error(json.message || "Unable to save experience.");
      }
      const exp = json.experience;
      setSnapshot(exp);
      setForm({
        ...form,
        profileStatus:
          exp.profileStatus === "none" ? "draft" : exp.profileStatus,
        selectedPortalModules: [...exp.selectedPortalModules],
        terminology: { ...exp.branding.terminology },
      });
      setSuccess("Client experience saved. Preview Portal to confirm the live composition.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save experience.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form || !snapshot) {
    return (
      <section className="kxd-os-card kxd-ces-exp" aria-busy="true">
        <p className="kxd-os-section__label">Manage Client Experience</p>
        <p className="kxd-os-meta">{error ?? "Loading experience…"}</p>
      </section>
    );
  }

  const modules = draft?.modules ?? snapshot.modules;
  const navPreview = draft?.navPreview ?? snapshot.navPreview;
  const homeShell = draft?.homeShell ?? snapshot.homeShell;
  const warnings = draft?.warnings ?? snapshot.warnings;
  const toggleRows = modules.filter((row) => row.kind === "toggle");
  const statusRows = modules.filter((row) => row.kind !== "toggle");

  return (
    <>
    <ClientExperienceComposer
      clientId={clientId}
      onActivated={(exp) => {
        setSnapshot(exp);
        setForm({
          profileStatus: exp.profileStatus === "none" ? "draft" : exp.profileStatus,
          clientName: exp.branding.clientName,
          portalSidebarLabel: exp.branding.portalSidebarLabel,
          welcomeEyebrow: exp.branding.welcomeEyebrow,
          reassuranceLine: exp.branding.reassuranceLine,
          supportTone: exp.branding.supportTone,
          primaryColor: exp.branding.primaryColor,
          secondaryColor: exp.branding.secondaryColor,
          accentColor: exp.branding.accentColor,
          borderRadiusPreset: exp.branding.borderRadiusPreset,
          motionPreset: exp.branding.motionPreset,
          showKxdPartnerMark: exp.branding.showKxdPartnerMark,
          partnerFooterLine: exp.branding.partnerFooterLine,
          terminology: { ...exp.branding.terminology },
          selectedPortalModules: [...exp.selectedPortalModules],
        });
        setSuccess("Recommended experience activated. Preview Portal to confirm live composition.");
      }}
    />
    <section className="kxd-os-card kxd-ces-exp">
      <details className="kxd-ces-exp__advanced">
        <summary>Advanced Configuration</summary>
      <div className="kxd-plans-access__head">
        <div>
          <p className="kxd-os-section__label">Manage Client Experience</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            Configure the existing Client Experience Profile. Preview uses Operator
            Portal Preview — not impersonation. Invites stay on Manage Portal Access.
          </p>
        </div>
        <span
          className={`kxd-plans-access__badge${
            form.profileStatus === "active" ? " kxd-plans-access__badge--active" : ""
          }${form.profileStatus !== "active" ? " kxd-plans-access__badge--warn" : ""}`}
        >
          {snapshot.profileStatus === "none" && form.profileStatus === "draft"
            ? "No profile yet"
            : form.profileStatus}
          {homeShell === "ces" ? " · CES shell" : " · HQ shell"}
        </span>
      </div>

      {warnings.length ? (
        <ul className="kxd-ces-exp__warnings">
          {warnings.map((warning) => (
            <li key={warning.id}>{warning.message}</li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="kxd-os-meta kxd-ces-exp__error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="kxd-os-meta" role="status">
          {success}
        </p>
      ) : null}

      <h3 className="kxd-ces-exp__h">Branding</h3>
      <div className="kxd-plans-access__grid">
        <label className="kxd-plans-access__field">
          Client display name
          <input
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            disabled={saving}
          />
        </label>
        <label className="kxd-plans-access__field">
          Portal sidebar label
          <input
            value={form.portalSidebarLabel}
            onChange={(e) => setForm({ ...form, portalSidebarLabel: e.target.value })}
            disabled={saving}
          />
        </label>
        <label className="kxd-plans-access__field">
          Welcome eyebrow
          <input
            value={form.welcomeEyebrow}
            onChange={(e) => setForm({ ...form, welcomeEyebrow: e.target.value })}
            disabled={saving}
          />
        </label>
        <label className="kxd-plans-access__field">
          Reassurance line
          <input
            value={form.reassuranceLine}
            onChange={(e) => setForm({ ...form, reassuranceLine: e.target.value })}
            disabled={saving}
          />
        </label>
        <label className="kxd-plans-access__field">
          Support tone
          <select
            value={form.supportTone}
            onChange={(e) =>
              setForm({
                ...form,
                supportTone: e.target.value as OperatorExperienceSaveInput["supportTone"],
              })
            }
            disabled={saving}
          >
            <option value="warm-professional">Warm & professional</option>
            <option value="direct">Direct</option>
            <option value="formal">Formal</option>
          </select>
        </label>
        <label className="kxd-plans-access__field">
          Profile status
          <select
            value={form.profileStatus}
            onChange={(e) =>
              setForm({
                ...form,
                profileStatus: e.target.value as OperatorExperienceSaveInput["profileStatus"],
              })
            }
            disabled={saving}
          >
            <option value="draft">Draft (does not change live portal)</option>
            <option value="active">Active (applies CES allowlist)</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="kxd-plans-access__field">
          Primary color
          <input
            value={form.primaryColor}
            onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
            disabled={saving}
          />
        </label>
        <label className="kxd-plans-access__field">
          Accent color
          <input
            value={form.accentColor}
            onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
            disabled={saving}
          />
        </label>
        <label className="kxd-plans-access__field">
          Secondary color
          <input
            value={form.secondaryColor}
            onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
            disabled={saving}
          />
        </label>
        <label className="kxd-plans-access__field">
          Border radius
          <select
            value={form.borderRadiusPreset}
            onChange={(e) =>
              setForm({
                ...form,
                borderRadiusPreset: e.target.value as OperatorExperienceSaveInput["borderRadiusPreset"],
              })
            }
            disabled={saving}
          >
            <option value="default">Default</option>
            <option value="soft">Soft</option>
            <option value="sharp">Sharp</option>
          </select>
        </label>
        <label className="kxd-plans-access__field">
          Motion
          <select
            value={form.motionPreset}
            onChange={(e) =>
              setForm({
                ...form,
                motionPreset: e.target.value as OperatorExperienceSaveInput["motionPreset"],
              })
            }
            disabled={saving}
          >
            <option value="calm">Calm</option>
            <option value="default">Default</option>
            <option value="reduced">Reduced</option>
          </select>
        </label>
        <label className="kxd-plans-access__field">
          Partner footer
          <input
            value={form.partnerFooterLine}
            onChange={(e) => setForm({ ...form, partnerFooterLine: e.target.value })}
            disabled={saving}
          />
        </label>
      </div>
      <label className="kxd-ces-exp__check">
        <input
          type="checkbox"
          checked={form.showKxdPartnerMark}
          onChange={(e) => setForm({ ...form, showKxdPartnerMark: e.target.checked })}
          disabled={saving}
        />
        Show KXD partner mark
      </label>

      <p className="kxd-os-meta kxd-ces-exp__logo">
        Logo: {snapshot.logo.hasLogo ? `on file (${snapshot.logo.source})` : "missing"}.{" "}
        {snapshot.logo.profileEditHref ? (
          <Link href={snapshot.logo.profileEditHref} className="kxd-os-link-quiet">
            Edit logo override in Payload →
          </Link>
        ) : null}
        {snapshot.logo.onboardingHref ? (
          <>
            {" "}
            <Link href={snapshot.logo.onboardingHref} className="kxd-os-link-quiet">
              Onboarding →
            </Link>
          </>
        ) : null}
        {snapshot.logo.brandKitHref ? (
          <>
            {" "}
            <Link href={snapshot.logo.brandKitHref} className="kxd-os-link-quiet">
              Brand kit →
            </Link>
          </>
        ) : null}
      </p>

      <div className="kxd-plans-access__grid">
        {OPERATOR_TERMINOLOGY_KEYS.map((key) => (
          <label key={key} className="kxd-plans-access__field">
            {TERMINOLOGY_LABELS[key]}
            <input
              value={form.terminology[key] ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  terminology: { ...form.terminology, [key]: e.target.value },
                })
              }
              disabled={saving}
            />
          </label>
        ))}
      </div>

      <h3 className="kxd-ces-exp__h">Modules</h3>
      <p className="kxd-os-meta">
        Active CES profiles allowlist HQ modules. Advisor stays locked. Internal
        systems never appear here.
      </p>
      <ul className="kxd-ces-exp__modules">
        {toggleRows.map((row) => {
          const disabled =
            saving ||
            row.effective === "not-available" ||
            (row.effective === "ineligible" && !selectedSet.has(row.id));
          return (
            <li key={row.id} className="kxd-ces-exp__module">
              <label className="kxd-ces-exp__check">
                <input
                  type="checkbox"
                  checked={selectedSet.has(row.id)}
                  disabled={disabled}
                  onChange={(e) => toggleModule(row.id, e.target.checked)}
                />
                <span>
                  <strong>{row.label}</strong>
                  <span className="kxd-os-meta"> {row.description}</span>
                </span>
              </label>
              <div className="kxd-ces-exp__module-meta">
                <span className={effectiveClass(row.effective)}>
                  {row.effective === "not-available"
                    ? "Not Available"
                    : row.effective.charAt(0).toUpperCase() + row.effective.slice(1)}
                </span>
                <span className="kxd-os-meta">
                  Plan {row.planAllows ? "allows" : "denies"} · Edition{" "}
                  {row.editionAllows ? "allows" : "denies"} · Profile{" "}
                  {selectedSet.has(row.id) ? "enables" : "off"}
                </span>
                <span className="kxd-os-meta">{row.effectiveNote}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <h4 className="kxd-ces-exp__h kxd-ces-exp__h--sub">Gated / always-on</h4>
      <ul className="kxd-plans-access__list kxd-plans-access__list--effective">
        {statusRows.map((row) => (
          <li key={row.id}>
            {row.label}
            <span>
              {row.effective === "visible" ? "Visible" : row.effective === "not-available" ? "Not Available" : "Hidden"}
              {" · "}
              {row.effectiveNote}
            </span>
          </li>
        ))}
      </ul>

      <h3 className="kxd-ces-exp__h">Effective access / navigation</h3>
      <p className="kxd-os-meta">
        Same resolver as the live portal. Updates as you edit — Save to persist.
        Shell: <strong>{homeShell === "ces" ? "CES" : "Client HQ"}</strong>.
        {form.profileStatus !== "active"
          ? " Draft/archived profiles keep generic HQ defaults until status is Active."
          : ""}
      </p>
      {navPreview.length === 0 ? (
        <p className="kxd-os-meta">No navigation groups visible.</p>
      ) : (
        navPreview.map((group) => (
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
        ))
      )}

      <h3 className="kxd-ces-exp__h">Integrations</h3>
      <ul className="kxd-plans-access__list kxd-plans-access__list--effective">
        {snapshot.integrations.map((row) => (
          <li key={row.id}>
            {row.label}
            <span>
              {row.status.replace(/-/g, " ")} — {row.detail}
              {row.value ? ` (${row.value})` : ""}
              {row.href ? (
                <>
                  {" "}
                  <Link href={row.href} className="kxd-os-link-quiet">
                    Manage →
                  </Link>
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <h3 className="kxd-ces-exp__h">Portal access</h3>
      <p className="kxd-os-meta">
        Primary contact: {snapshot.portalAccess.primaryContact ?? "—"} · Memberships:{" "}
        {snapshot.portalAccess.activeMembershipCount} active · Pending invitations:{" "}
        {snapshot.portalAccess.pendingInvitationCount}
        {snapshot.portalAccess.multiAccountContacts > 0
          ? ` · ${snapshot.portalAccess.multiAccountContacts} multi-account contact(s)`
          : ""}
      </p>
      {snapshot.portalAccess.contacts.length ? (
        <ul className="kxd-plans-access__list kxd-plans-access__list--effective">
          {snapshot.portalAccess.contacts.map((contact) => (
            <li key={contact.id}>
              {contact.displayName || contact.email || `User #${contact.id}`}
              <span>
                {contact.membershipStatus}
                {contact.role ? ` · ${contact.role}` : ""}
                {contact.multiAccount ? " · multi-account" : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="kxd-os-meta">No portal memberships for this client.</p>
      )}
      {snapshot.portalAccess.invitations.length ? (
        <ul className="kxd-plans-access__list">
          {snapshot.portalAccess.invitations.map((invite) => (
            <li key={invite.id}>
              {invite.email} — {invite.status} (not sent from this screen)
            </li>
          ))}
        </ul>
      ) : null}

      <div className="kxd-plans-access__actions">
        <button
          type="button"
          className="kxd-plans-access__save"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save Experience"}
        </button>
        <PortalPreviewQuickAction clientId={clientId} label="Preview Portal" />
        <Link
          href={snapshot.portalAccess.manageHref}
          className="kxd-os-command-workspace__action"
        >
          Manage Portal Access
        </Link>
        <Link
          href={`/admin/operations/client-command/${clientId}?tab=overview`}
          className="kxd-os-link-quiet"
        >
          Plans & Access →
        </Link>
      </div>
      </details>
    </section>
    </>
  );
}
