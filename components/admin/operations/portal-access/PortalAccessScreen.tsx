"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type { PortalAccessData, PortalAccessMembershipRow, PortalAccessUserRow } from "@/lib/portal/access-data";
import type { PortalReadinessIssue } from "@/lib/portal/readiness";

function issueClass(level: PortalReadinessIssue["level"]): string {
  if (level === "blocker") return "kxd-os-portal-access__issue--blocker";
  if (level === "warning") return "kxd-os-portal-access__issue--warning";
  return "kxd-os-portal-access__issue--info";
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface PortalAccessScreenProps {
  data: PortalAccessData;
}

function PortalAccessScreenInner({ data: initialData }: PortalAccessScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = Number.parseInt(searchParams.get("client") ?? "", 10);

  const [users, setUsers] = useState(initialData.users);
  const [clientFilter, setClientFilter] = useState<number | "all">(
    Number.isFinite(initialClientId) ? initialClientId : "all",
  );
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [membershipClientId, setMembershipClientId] = useState("");
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);

  const [form, setForm] = useState({
    displayName: "",
    email: "",
    clientId: Number.isFinite(initialClientId)
      ? String(initialClientId)
      : initialData.clients.find((c) => c.clientSlug === "primal-motorsports")?.clientId != null
        ? String(initialData.clients.find((c) => c.clientSlug === "primal-motorsports")!.clientId)
        : "",
    password: "",
  });

  const visibleUsers = useMemo(() => {
    if (clientFilter === "all") return users;
    return users.filter(
      (user) =>
        user.clientId === clientFilter ||
        user.memberships.some((m) => m.clientId === clientFilter),
    );
  }, [clientFilter, users]);

  const readinessRows = useMemo(() => {
    if (clientFilter === "all") return initialData.clients;
    return initialData.clients.filter((client) => client.clientId === clientFilter);
  }, [clientFilter, initialData.clients]);

  const primalClient = initialData.clients.find((c) => c.isProductionCandidate);
  const showPrimalBanner = clientFilter === "all" || primalClient?.clientId === clientFilter;

  function applyMemberships(userId: number, memberships: PortalAccessMembershipRow[]) {
    setUsers((prev) =>
      prev.map((row) => {
        if (row.id !== userId) return row;
        const defaultMembership = memberships.find((m) => m.isDefault && m.status === "active");
        return {
          ...row,
          memberships,
          ...(defaultMembership
            ? {
                clientId: defaultMembership.clientId,
                clientName: defaultMembership.clientName,
                clientSlug: defaultMembership.clientSlug,
                lastActiveClientId: defaultMembership.clientId,
              }
            : {}),
        };
      }),
    );
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const res = await fetch("/api/admin/portal-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          displayName: form.displayName,
          clientId: Number.parseInt(form.clientId, 10),
          password: form.password,
          active: true,
        }),
      });

      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        id?: number;
        email?: string;
        displayName?: string;
        clientId?: number;
      };

      if (!res.ok || !body.ok || !body.id) {
        throw new Error(body.error ?? "Could not create portal user.");
      }

      const client = initialData.clients.find((row) => row.clientId === body.clientId);
      const newUser: PortalAccessUserRow = {
        id: body.id,
        email: body.email ?? form.email,
        displayName: body.displayName ?? form.displayName,
        clientId: body.clientId ?? Number.parseInt(form.clientId, 10),
        clientName: client?.clientName ?? "Client",
        clientSlug: client?.clientSlug ?? null,
        lastActiveClientId: body.clientId ?? Number.parseInt(form.clientId, 10),
        active: true,
        welcomeCompleted: false,
        createdAt: new Date().toISOString(),
        payloadAdminUrl: `/admin/collections/portal-users/${body.id}`,
        memberships: [
          {
            id: -1,
            clientId: body.clientId ?? Number.parseInt(form.clientId, 10),
            clientName: client?.clientName ?? "Client",
            clientSlug: client?.clientSlug ?? null,
            status: "active",
            isDefault: true,
          },
        ],
      };

      setUsers((prev) => [...prev, newUser].sort((a, b) => a.email.localeCompare(b.email)));
      setCreateSuccess(
        `Portal access created for ${newUser.displayName ?? newUser.email}. Share login credentials securely, then ask them to reset their password after first sign-in.`,
      );
      setForm((prev) => ({ ...prev, email: "", displayName: "", password: "" }));
      setShowCreate(false);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create portal user.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(user: PortalAccessUserRow) {
    setTogglingId(user.id);
    setToggleError(null);

    try {
      const res = await fetch(`/api/admin/portal-users/${user.id}/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });

      const body = (await res.json()) as { ok?: boolean; active?: boolean; error?: string };
      if (!res.ok || !body.ok || typeof body.active !== "boolean") {
        throw new Error(body.error ?? "Could not update access state.");
      }

      setUsers((prev) =>
        prev.map((row) => (row.id === user.id ? { ...row, active: body.active! } : row)),
      );
      router.refresh();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Could not update access state.");
    } finally {
      setTogglingId(null);
    }
  }

  async function addMembership(user: PortalAccessUserRow) {
    const clientId = Number.parseInt(membershipClientId, 10);
    if (!Number.isFinite(clientId)) {
      setMembershipError("Select a client.");
      return;
    }
    setMembershipBusy(true);
    setMembershipError(null);
    try {
      const res = await fetch(`/api/admin/portal-users/${user.id}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        memberships?: PortalAccessMembershipRow[];
      };
      if (!res.ok || !body.ok || !body.memberships) {
        throw new Error(body.error ?? "Could not add membership.");
      }
      applyMemberships(user.id, body.memberships);
      setMembershipClientId("");
      router.refresh();
    } catch (err) {
      setMembershipError(err instanceof Error ? err.message : "Could not add membership.");
    } finally {
      setMembershipBusy(false);
    }
  }

  async function setMembershipStatus(
    user: PortalAccessUserRow,
    membership: PortalAccessMembershipRow,
    status: "active" | "disabled",
  ) {
    setMembershipBusy(true);
    setMembershipError(null);
    try {
      const res = await fetch(
        `/api/admin/portal-users/${user.id}/memberships/${membership.id}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        memberships?: PortalAccessMembershipRow[];
      };
      if (!res.ok || !body.ok || !body.memberships) {
        throw new Error(body.error ?? "Could not update membership.");
      }
      applyMemberships(user.id, body.memberships);
      router.refresh();
    } catch (err) {
      setMembershipError(err instanceof Error ? err.message : "Could not update membership.");
    } finally {
      setMembershipBusy(false);
    }
  }

  async function setDefaultMembership(
    user: PortalAccessUserRow,
    membership: PortalAccessMembershipRow,
  ) {
    setMembershipBusy(true);
    setMembershipError(null);
    try {
      const res = await fetch(
        `/api/admin/portal-users/${user.id}/memberships/${membership.id}/default`,
        { method: "POST" },
      );
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        memberships?: PortalAccessMembershipRow[];
      };
      if (!res.ok || !body.ok || !body.memberships) {
        throw new Error(body.error ?? "Could not set default membership.");
      }
      applyMemberships(user.id, body.memberships);
      router.refresh();
    } catch (err) {
      setMembershipError(err instanceof Error ? err.message : "Could not set default.");
    } finally {
      setMembershipBusy(false);
    }
  }

  return (
    <OperationsShell activeId="portal-access">
      <KxdPage className="kxd-os-ops-page">
        <OperationsPageHero
          eyebrow="Client Portal"
          title="Portal Access"
          lead="Create and manage client login accounts. Legacy primary client remains during Phase 4 transition; memberships authorize multi-client access."
        />

        {createSuccess ? (
          <p className="kxd-os-portal-access__notice" role="status">
            {createSuccess}
          </p>
        ) : null}

        {toggleError ? (
          <p className="kxd-os-portal-access__notice kxd-os-portal-access__notice--error" role="alert">
            {toggleError}
          </p>
        ) : null}

        {initialData.resendWarning ? (
          <p className="kxd-os-portal-access__notice kxd-os-portal-access__notice--error" role="alert">
            {initialData.resendWarning}
          </p>
        ) : null}

        {!initialData.membershipSchemaAvailable ? (
          <p className="kxd-os-portal-access__notice" role="status">
            Multi-client membership management is temporarily unavailable pending database
            activation. Single-client portal access via the legacy primary client continues to
            work. Membership create, disable, and default controls stay inactive until the
            schema is activated.
          </p>
        ) : null}

        {showPrimalBanner && primalClient ? (
          <section className="kxd-os-portal-access__launch-card" aria-labelledby="primal-launch-heading">
            <div className="kxd-os-portal-access__launch-head">
              <div>
                <p className="kxd-os-portal-access__launch-eyebrow">Production candidate</p>
                <h2 id="primal-launch-heading" className="kxd-os-portal-access__launch-title">
                  {primalClient.clientName}
                </h2>
                <p className="kxd-os-portal-access__launch-meta">
                  {primalClient.websiteUrl ?? "No website URL configured"}
                  {primalClient.accentColor ? ` · Accent ${primalClient.accentColor}` : ""}
                </p>
              </div>
              <OpsStatusBadge
                label={primalClient.ready ? "Core config ready" : "Action required"}
                variant={primalClient.ready ? "success" : "warning"}
              />
            </div>
            <ul className="kxd-os-portal-access__issues">
              {primalClient.issues
                .filter((issue) => issue.level !== "info" || primalClient.ready)
                .map((issue) => (
                  <li key={issue.id} className={`kxd-os-portal-access__issue ${issueClass(issue.level)}`}>
                    {issue.message}
                  </li>
                ))}
            </ul>
            <div className="kxd-os-portal-access__launch-links">
              <Link href={primalClient.payloadClientUrl} className="kxd-os-link-quiet">
                Edit client
              </Link>
              {primalClient.payloadCesProfileUrl ? (
                <Link href={primalClient.payloadCesProfileUrl} className="kxd-os-link-quiet">
                  Edit CES profile
                </Link>
              ) : null}
              <Link
                href={`/admin/operations/portal-access?client=${primalClient.clientId}`}
                className="kxd-os-link-quiet"
              >
                Manage portal users
              </Link>
            </div>
          </section>
        ) : null}

        <section className="kxd-os-ops-section">
          <OpsSectionHead label="Client readiness" count={readinessRows.length} />
          <OpsCard className="kxd-os-portal-access__readiness">
            {readinessRows.map((client) => (
              <div
                key={client.clientId}
                className={`kxd-os-portal-access__readiness-row${
                  client.isProductionCandidate ? " kxd-os-portal-access__readiness-row--featured" : ""
                }`}
              >
                <div>
                  <p className="kxd-os-portal-access__readiness-name">
                    {client.clientName}
                    {client.clientSlug ? (
                      <span className="kxd-os-portal-access__readiness-slug"> · {client.clientSlug}</span>
                    ) : null}
                  </p>
                  <p className="kxd-os-portal-access__readiness-meta">
                    {client.activePortalUserCount} active portal user
                    {client.activePortalUserCount === 1 ? "" : "s"}
                    {client.websiteUrl ? ` · ${client.websiteUrl}` : " · No website URL"}
                  </p>
                  {client.issues.some((issue) => issue.level !== "info") ? (
                    <ul className="kxd-os-portal-access__issues kxd-os-portal-access__issues--compact">
                      {client.issues
                        .filter((issue) => issue.level !== "info")
                        .map((issue) => (
                          <li
                            key={issue.id}
                            className={`kxd-os-portal-access__issue ${issueClass(issue.level)}`}
                          >
                            {issue.message}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>
                <div className="kxd-os-portal-access__readiness-badges">
                  <OpsStatusBadge
                    label={client.ready ? "Ready" : "Needs attention"}
                    variant={client.ready ? "success" : "warning"}
                  />
                  <OpsStatusBadge
                    label={
                      client.cesProfileStatus === "active"
                        ? "CES active"
                        : client.cesProfileStatus === "draft"
                          ? "CES draft"
                          : client.cesProfileStatus === "archived"
                            ? "CES archived"
                            : "No CES profile"
                    }
                    variant={client.cesProfileStatus === "active" ? "success" : "warning"}
                  />
                  <OpsStatusBadge
                    label={
                      client.cesModules.includes("website-review")
                        ? "Website Review"
                        : "No modules"
                    }
                    variant={client.cesModules.includes("website-review") ? "status" : "default"}
                  />
                  <OpsStatusBadge
                    label={client.websiteUrl ? "Visual Review URL" : "No website URL"}
                    variant={client.websiteUrl ? "default" : "warning"}
                  />
                </div>
              </div>
            ))}
          </OpsCard>
        </section>

        <section className="kxd-os-ops-section">
          <div className="kxd-os-portal-access__toolbar">
            <OpsSectionHead label="Portal users" count={visibleUsers.length} />
            <div className="kxd-os-portal-access__toolbar-actions">
              <label className="kxd-os-portal-access__filter">
                <span className="kxd-os-portal-access__filter-label">Client</span>
                <select
                  value={clientFilter === "all" ? "all" : String(clientFilter)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setClientFilter(value === "all" ? "all" : Number.parseInt(value, 10));
                  }}
                >
                  <option value="all">All clients</option>
                  {initialData.clients.map((client) => (
                    <option key={client.clientId} value={client.clientId}>
                      {client.clientName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--secondary"
                onClick={() => {
                  setShowCreate((open) => !open);
                  setCreateError(null);
                }}
              >
                {showCreate ? "Close form" : "Add portal user"}
              </button>
            </div>
          </div>

          {showCreate ? (
            <OpsCard className="kxd-os-portal-access__create">
              <form onSubmit={(event) => void handleCreate(event)}>
                <div className="kxd-os-form-grid">
                  <label className="kxd-os-portal-access__field">
                    <span>Display name</span>
                    <input
                      type="text"
                      required
                      value={form.displayName}
                      onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Adam"
                    />
                  </label>
                  <label className="kxd-os-portal-access__field">
                    <span>Email</span>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="adam@primalmotorsports.com"
                    />
                  </label>
                  <label className="kxd-os-portal-access__field">
                    <span>Client</span>
                    <select
                      required
                      value={form.clientId}
                      onChange={(e) => setForm((prev) => ({ ...prev, clientId: e.target.value }))}
                    >
                      <option value="" disabled>
                        Select client
                      </option>
                      {initialData.clients.map((client) => (
                        <option key={client.clientId} value={client.clientId}>
                          {client.clientName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="kxd-os-portal-access__field">
                    <span>Temporary password</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="8+ characters"
                    />
                  </label>
                </div>
                <p className="kxd-os-portal-access__hint">
                  Share credentials securely. Clients can reset their password anytime from the portal login screen.
                </p>
                {createError ? (
                  <p className="kxd-os-portal-access__notice kxd-os-portal-access__notice--error" role="alert">
                    {createError}
                  </p>
                ) : null}
                <div className="kxd-os-portal-access__create-actions">
                  <button
                    type="submit"
                    className="kxd-os-btn kxd-os-btn--primary"
                    disabled={creating}
                  >
                    {creating ? "Creating…" : "Create portal access"}
                  </button>
                </div>
              </form>
            </OpsCard>
          ) : null}

          {visibleUsers.length === 0 ? (
            <OpsEmpty message="No portal users for this client yet." />
          ) : (
            <OpsCard className="kxd-os-portal-access__table">
              <div className="kxd-os-portal-access__head" aria-hidden>
                <span>Name</span>
                <span>Email</span>
                <span>Client</span>
                <span>Welcome</span>
                <span>Created</span>
                <span>Access</span>
              </div>

              {visibleUsers.map((user) => (
                <div key={user.id} className="kxd-os-portal-access__user-block">
                  <div className="kxd-os-portal-access__row">
                    <div className="kxd-os-portal-access__primary">
                      <Link href={user.payloadAdminUrl} className="kxd-os-portal-access__name">
                        {user.displayName ?? user.email}
                      </Link>
                    </div>
                    <div className="kxd-os-portal-access__cell" data-label="Email">
                      {user.email}
                    </div>
                    <div className="kxd-os-portal-access__cell" data-label="Client">
                      {user.clientName}
                      <span className="kxd-os-portal-access__readiness-slug">
                        {" "}
                        · legacy primary
                      </span>
                    </div>
                    <div className="kxd-os-portal-access__cell" data-label="Welcome">
                      {user.welcomeCompleted ? "Complete" : "Pending"}
                    </div>
                    <div className="kxd-os-portal-access__cell" data-label="Created">
                      <time dateTime={user.createdAt}>{fmtDate(user.createdAt)}</time>
                    </div>
                    <div
                      className="kxd-os-portal-access__cell kxd-os-portal-access__cell--actions"
                      data-label="Access"
                    >
                      <OpsStatusBadge
                        label={user.active ? "Active" : "Inactive"}
                        variant={user.active ? "success" : "default"}
                      />
                      <button
                        type="button"
                        className="kxd-os-btn kxd-os-btn--secondary kxd-os-portal-access__toggle"
                        disabled={togglingId === user.id}
                        onClick={() => void toggleActive(user)}
                      >
                        {togglingId === user.id
                          ? "Saving…"
                          : user.active
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="kxd-os-btn kxd-os-btn--secondary kxd-os-portal-access__toggle"
                        onClick={() => {
                          setExpandedUserId((id) => (id === user.id ? null : user.id));
                          setMembershipError(null);
                          setMembershipClientId("");
                        }}
                      >
                        {expandedUserId === user.id ? "Hide memberships" : "Memberships"}
                      </button>
                      <Link href={user.payloadAdminUrl} className="kxd-os-link-quiet">
                        Edit in admin
                      </Link>
                    </div>
                  </div>

                  {expandedUserId === user.id ? (
                    <div className="kxd-os-portal-access__memberships">
                      <p className="kxd-os-portal-access__hint">
                        Memberships authorize which clients this login may access. Default
                        membership aligns the legacy primary client during Phase 4 transition.
                      </p>
                      {user.memberships.length === 0 ? (
                        <p className="kxd-os-portal-access__hint">No memberships yet.</p>
                      ) : (
                        <ul className="kxd-os-portal-access__issues">
                          {user.memberships.map((membership) => (
                            <li key={membership.id} className="kxd-os-portal-access__membership-row">
                              <span>
                                {membership.clientName}
                                {membership.isDefault ? " · default" : ""}
                                {membership.status === "disabled" ? " · disabled" : ""}
                              </span>
                              <span className="kxd-os-portal-access__membership-actions">
                                {membership.status === "active" && !membership.isDefault ? (
                                  <button
                                    type="button"
                                    className="kxd-os-link-quiet"
                                    disabled={
                                      !initialData.membershipSchemaAvailable || membershipBusy
                                    }
                                    onClick={() => void setDefaultMembership(user, membership)}
                                  >
                                    Set default
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="kxd-os-link-quiet"
                                  disabled={
                                    !initialData.membershipSchemaAvailable ||
                                    membershipBusy ||
                                    membership.id < 0
                                  }
                                  onClick={() =>
                                    void setMembershipStatus(
                                      user,
                                      membership,
                                      membership.status === "active" ? "disabled" : "active",
                                    )
                                  }
                                >
                                  {membership.status === "active" ? "Disable" : "Reactivate"}
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="kxd-os-portal-access__create-actions">
                        <label className="kxd-os-portal-access__field">
                          <span>Add membership</span>
                          <select
                            value={membershipClientId}
                            onChange={(e) => setMembershipClientId(e.target.value)}
                            disabled={!initialData.membershipSchemaAvailable || membershipBusy}
                          >
                            <option value="">Select client</option>
                            {initialData.clients
                              .filter(
                                (client) =>
                                  !user.memberships.some(
                                    (m) => m.clientId === client.clientId && m.status === "active",
                                  ),
                              )
                              .map((client) => (
                                <option key={client.clientId} value={client.clientId}>
                                  {client.clientName}
                                </option>
                              ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="kxd-os-btn kxd-os-btn--secondary"
                          disabled={
                            !initialData.membershipSchemaAvailable ||
                            membershipBusy ||
                            !membershipClientId
                          }
                          onClick={() => void addMembership(user)}
                        >
                          {membershipBusy ? "Saving…" : "Add membership"}
                        </button>
                      </div>
                      {membershipError ? (
                        <p
                          className="kxd-os-portal-access__notice kxd-os-portal-access__notice--error"
                          role="alert"
                        >
                          {membershipError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </OpsCard>
          )}
        </section>
      </KxdPage>
    </OperationsShell>
  );
}

export function PortalAccessScreen(props: PortalAccessScreenProps) {
  return (
    <Suspense fallback={null}>
      <PortalAccessScreenInner {...props} />
    </Suspense>
  );
}
