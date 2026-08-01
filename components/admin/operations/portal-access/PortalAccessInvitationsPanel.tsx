"use client";

import { useState } from "react";
import {
  OpsCard,
  OpsEmpty,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import type { PortalAccessClientReadiness, PortalInvitationRow } from "@/lib/portal/access-data";
import {
  PORTAL_MEMBERSHIP_ROLE_LABELS,
  type PortalMembershipRole,
} from "@/lib/portal/identity/roles";

type MembershipDraft = { clientId: string; role: PortalMembershipRole };

export function PortalAccessInvitationsPanel(props: {
  initialInvitations: PortalInvitationRow[];
  clients: PortalAccessClientReadiness[];
  identitySchemaAvailable: boolean;
  resendConfigured: boolean;
}) {
  const [invitations, setInvitations] = useState(props.initialInvitations);
  const [showCompose, setShowCompose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    welcomeNote: "",
    allowExistingUserExpansion: false,
    sendNow: true,
    memberships: [{ clientId: "", role: "client-member" as PortalMembershipRole }],
  });

  function upsertInvitation(row: PortalInvitationRow) {
    setInvitations((prev) => {
      const without = prev.filter((i) => i.id !== row.id);
      return [row, ...without].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  async function handleCompose(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const memberships = form.memberships
        .map((m) => ({
          clientId: Number.parseInt(m.clientId, 10),
          role: m.role,
        }))
        .filter((m) => Number.isFinite(m.clientId) && m.clientId > 0);

      const res = await fetch("/api/admin/portal-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          displayName: form.displayName,
          welcomeNote: form.welcomeNote,
          allowExistingUserExpansion: form.allowExistingUserExpansion,
          sendNow: form.sendNow,
          memberships,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        invitation?: PortalInvitationRow;
        emailSent?: boolean;
        activateUrlForDev?: string;
      };
      if (!res.ok || !body.ok || !body.invitation) {
        throw new Error(body.error ?? "Could not create invitation.");
      }
      upsertInvitation(body.invitation);
      setShowCompose(false);
      setForm({
        displayName: "",
        email: "",
        welcomeNote: "",
        allowExistingUserExpansion: false,
        sendNow: true,
        memberships: [{ clientId: "", role: "client-member" }],
      });
      let msg = form.sendNow
        ? body.emailSent
          ? "Invitation sent."
          : "Invitation saved. Email was not sent (Resend may be unconfigured)."
        : "Invitation draft saved.";
      if (body.activateUrlForDev) {
        msg += ` Local activate URL: ${body.activateUrlForDev}`;
      }
      setNotice(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function resend(invitation: PortalInvitationRow) {
    if (!window.confirm(`Resend invitation to ${invitation.email}? Prior links will stop working.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/portal-invitations/${invitation.id}/send`, {
        method: "POST",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        invitation?: PortalInvitationRow;
        emailSent?: boolean;
        activateUrlForDev?: string;
      };
      if (!res.ok || !body.ok || !body.invitation) {
        throw new Error(body.error ?? "Could not resend.");
      }
      upsertInvitation(body.invitation);
      let msg = body.emailSent ? "Invitation resent." : "Invitation token rotated; email not sent.";
      if (body.activateUrlForDev) msg += ` Local activate URL: ${body.activateUrlForDev}`;
      setNotice(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(invitation: PortalInvitationRow) {
    if (!window.confirm(`Revoke invitation for ${invitation.email}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/portal-invitations/${invitation.id}/revoke`, {
        method: "POST",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        invitation?: PortalInvitationRow;
      };
      if (!res.ok || !body.ok || !body.invitation) {
        throw new Error(body.error ?? "Could not revoke.");
      }
      upsertInvitation(body.invitation);
      setNotice("Invitation revoked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke.");
    } finally {
      setBusy(false);
    }
  }

  function updateMembership(index: number, patch: Partial<MembershipDraft>) {
    setForm((prev) => ({
      ...prev,
      memberships: prev.memberships.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  return (
    <section className="kxd-os-ops-section">
      <div className="kxd-os-portal-access__toolbar">
        <OpsSectionHead label="Invitations" count={invitations.length} />
        <div className="kxd-os-portal-access__toolbar-actions">
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--primary"
            disabled={!props.identitySchemaAvailable}
            onClick={() => {
              setShowCompose((v) => !v);
              setError(null);
            }}
          >
            {showCompose ? "Close invite" : "Invite to portal"}
          </button>
        </div>
      </div>

      {!props.identitySchemaAvailable ? (
        <p className="kxd-os-portal-access__notice" role="status">
          Invitation schema is not activated yet. Run the Batch I migration locally before sending
          invites. Never migrate production from this batch without separate approval.
        </p>
      ) : null}

      {!props.resendConfigured ? (
        <p className="kxd-os-portal-access__notice" role="status">
          RESEND_API_KEY is not configured. Invitations can still be drafted; local activate URLs
          appear when send is skipped.
        </p>
      ) : null}

      {notice ? (
        <p className="kxd-os-portal-access__notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="kxd-os-portal-access__notice kxd-os-portal-access__notice--error" role="alert">
          {error}
        </p>
      ) : null}

      {showCompose ? (
        <OpsCard className="kxd-os-portal-access__create">
          <form onSubmit={(e) => void handleCompose(e)}>
            <div className="kxd-os-form-grid">
              <label className="kxd-os-portal-access__field">
                <span>Display name</span>
                <input
                  type="text"
                  required
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                />
              </label>
              <label className="kxd-os-portal-access__field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>
            </div>
            <label className="kxd-os-portal-access__field" style={{ display: "block", marginTop: 16 }}>
              <span>Welcome note (optional)</span>
              <textarea
                rows={3}
                value={form.welcomeNote}
                onChange={(e) => setForm((p) => ({ ...p, welcomeNote: e.target.value }))}
              />
            </label>
            <div style={{ marginTop: 16 }}>
              <p className="kxd-os-portal-access__hint">
                Client access (multi-client + per-client role). Email identity only — never domain
                grants. Client-delegated invites are disabled in early access.
              </p>
              {form.memberships.map((row, index) => (
                <div key={index} className="kxd-os-form-grid" style={{ marginTop: 8 }}>
                  <label className="kxd-os-portal-access__field">
                    <span>Client</span>
                    <select
                      required
                      value={row.clientId}
                      onChange={(e) => updateMembership(index, { clientId: e.target.value })}
                    >
                      <option value="">Select client</option>
                      {props.clients.map((c) => (
                        <option key={c.clientId} value={c.clientId}>
                          {c.clientName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="kxd-os-portal-access__field">
                    <span>Role</span>
                    <select
                      value={row.role}
                      onChange={(e) =>
                        updateMembership(index, {
                          role: e.target.value as PortalMembershipRole,
                        })
                      }
                    >
                      {(Object.keys(PORTAL_MEMBERSHIP_ROLE_LABELS) as PortalMembershipRole[]).map(
                        (role) => (
                          <option key={role} value={role}>
                            {PORTAL_MEMBERSHIP_ROLE_LABELS[role]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="kxd-os-link-quiet"
                style={{ marginTop: 8 }}
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    memberships: [
                      ...p.memberships,
                      { clientId: "", role: "client-member" },
                    ],
                  }))
                }
              >
                Add another client
              </button>
            </div>
            <label className="kxd-os-portal-access__field" style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <input
                type="checkbox"
                checked={form.allowExistingUserExpansion}
                onChange={(e) =>
                  setForm((p) => ({ ...p, allowExistingUserExpansion: e.target.checked }))
                }
              />
              <span>Allow adding memberships to an existing active portal user (no silent role elevation)</span>
            </label>
            <label className="kxd-os-portal-access__field" style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={form.sendNow}
                onChange={(e) => setForm((p) => ({ ...p, sendNow: e.target.checked }))}
              />
              <span>Send invitation email now (48-hour personal link)</span>
            </label>
            <div className="kxd-os-portal-access__create-actions" style={{ marginTop: 16 }}>
              <button type="submit" className="kxd-os-btn kxd-os-btn--primary" disabled={busy}>
                {busy ? "Saving…" : form.sendNow ? "Create & send invitation" : "Save draft"}
              </button>
            </div>
          </form>
        </OpsCard>
      ) : null}

      {invitations.length === 0 ? (
        <OpsEmpty message="No invitations yet. Invite is the primary path for new portal access." />
      ) : (
        <OpsCard className="kxd-os-portal-access__table">
          {invitations.map((inv) => (
            <div key={inv.id} className="kxd-os-portal-access__row" style={{ display: "grid", gap: 8 }}>
              <div>
                <strong>{inv.displayName ?? inv.email}</strong>
                <div className="kxd-os-portal-access__readiness-meta">
                  {inv.email}
                  {" · "}
                  {inv.memberships
                    .map(
                      (m) =>
                        `${m.clientName} (${PORTAL_MEMBERSHIP_ROLE_LABELS[m.role] ?? m.role})`,
                    )
                    .join(", ")}
                </div>
              </div>
              <div className="kxd-os-portal-access__cell--actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <OpsStatusBadge label={inv.status} variant={inv.status === "accepted" ? "success" : "default"} />
                {inv.status === "sent" || inv.status === "opened" || inv.status === "draft" ? (
                  <>
                    <button
                      type="button"
                      className="kxd-os-btn kxd-os-btn--secondary"
                      disabled={busy}
                      onClick={() => void resend(inv)}
                    >
                      {inv.status === "draft" ? "Send" : "Resend"}
                    </button>
                    <button
                      type="button"
                      className="kxd-os-btn kxd-os-btn--secondary"
                      disabled={busy || inv.status === "draft"}
                      onClick={() => void revoke(inv)}
                    >
                      Revoke
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </OpsCard>
      )}
    </section>
  );
}
