"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsEmpty,
  OpsKpiStrip,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import {
  activationEligibilityLabel,
  applyCatalogDefaults,
  commercialAddOnLabel,
  commercialProvisioningLabel,
  commercialRecordStatusLabel,
  listCommercialAgreements,
  type ActivationPreview,
  type ActivationResult,
  type ClientCommercialAgreementRecord,
  type CommercialAgreementFieldErrors,
  type CommercialAgreementId,
} from "@/lib/commercial-agreements";
import { PARTNERSHIP_ADD_ONS } from "@/lib/partnerships/packages";

type ListResponse = {
  ok?: boolean;
  message?: string;
  agreements?: ClientCommercialAgreementRecord[];
  totals?: {
    clients: number;
    recorded: number;
    unset: number;
    notProvisioned: number;
  };
};

type DetailResponse = {
  ok?: boolean;
  message?: string;
  notice?: string;
  agreement?: ClientCommercialAgreementRecord;
  fieldErrors?: CommercialAgreementFieldErrors;
};

type PreviewResponse = {
  ok?: boolean;
  message?: string;
  preview?: ActivationPreview;
};

type ActivateResponse = {
  ok?: boolean;
  message?: string;
  code?: string;
  result?: ActivationResult;
};

type EditorMode = "idle" | "edit" | "create";
type ActivationPhase = "closed" | "preview" | "result";
type Draft = {
  commercialAgreementId: CommercialAgreementId | "";
  monthlyRetainerAmount: string;
  setupFee: string;
  monthlyServiceCredits: string;
  commercialAddOns: string[];
  commercialNotes: string;
};

function emptyDraft(): Draft {
  return {
    commercialAgreementId: "",
    monthlyRetainerAmount: "",
    setupFee: "",
    monthlyServiceCredits: "",
    commercialAddOns: [],
    commercialNotes: "",
  };
}

function draftFromRecord(row: ClientCommercialAgreementRecord): Draft {
  return {
    commercialAgreementId: row.commercialAgreementId ?? "",
    monthlyRetainerAmount:
      row.monthlyRetainerAmount != null ? String(row.monthlyRetainerAmount) : "",
    setupFee: row.setupFee != null ? String(row.setupFee) : "",
    monthlyServiceCredits:
      row.monthlyServiceCredits != null
        ? String(row.monthlyServiceCredits)
        : "",
    commercialAddOns: [...row.commercialAddOns],
    commercialNotes: row.commercialNotes ?? "",
  };
}

function fmtMoney(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function draftsEqual(a: Draft, b: Draft): boolean {
  return (
    a.commercialAgreementId === b.commercialAgreementId &&
    a.monthlyRetainerAmount === b.monthlyRetainerAmount &&
    a.setupFee === b.setupFee &&
    a.monthlyServiceCredits === b.monthlyServiceCredits &&
    a.commercialNotes === b.commercialNotes &&
    a.commercialAddOns.length === b.commercialAddOns.length &&
    a.commercialAddOns.every((id, i) => id === b.commercialAddOns[i])
  );
}

export function CommercialAgreementsScreen() {
  const catalog = useMemo(() => listCommercialAgreements(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ClientCommercialAgreementRecord[]>([]);
  const [allClients, setAllClients] = useState<ClientCommercialAgreementRecord[]>(
    [],
  );
  const [totals, setTotals] = useState({
    clients: 0,
    recorded: 0,
    unset: 0,
    notProvisioned: 0,
  });
  const [search, setSearch] = useState("");
  const [agreementFilter, setAgreementFilter] = useState<string>("all");
  const [recordFilter, setRecordFilter] = useState<"all" | "recorded" | "unset">(
    "all",
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ClientCommercialAgreementRecord | null>(
    null,
  );
  const [mode, setMode] = useState<EditorMode>("idle");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [baseline, setBaseline] = useState<Draft>(emptyDraft());
  const [createClientId, setCreateClientId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] =
    useState<CommercialAgreementFieldErrors>({});

  const [activationPhase, setActivationPhase] =
    useState<ActivationPhase>("closed");
  const [activationPreview, setActivationPreview] =
    useState<ActivationPreview | null>(null);
  const [activationResult, setActivationResult] =
    useState<ActivationResult | null>(null);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationAcknowledged, setActivationAcknowledged] = useState(false);

  const dirty = mode !== "idle" && !draftsEqual(draft, baseline);

  function resetActivation() {
    setActivationPhase("closed");
    setActivationPreview(null);
    setActivationResult(null);
    setActivationLoading(false);
    setActivationError(null);
    setActivationAcknowledged(false);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (agreementFilter !== "all") params.set("agreementId", agreementFilter);
      if (recordFilter !== "all") params.set("recordStatus", recordFilter);
      const [filteredRes, allRes] = await Promise.all([
        fetch(`/api/admin/commercial-agreements?${params.toString()}`, {
          credentials: "same-origin",
        }),
        fetch(`/api/admin/commercial-agreements`, {
          credentials: "same-origin",
        }),
      ]);
      const json = (await filteredRes.json()) as ListResponse;
      const allJson = (await allRes.json()) as ListResponse;
      if (!filteredRes.ok || !json.ok) {
        throw new Error(json.message || "Unable to load agreements.");
      }
      setItems(json.agreements ?? []);
      if (json.totals) setTotals(json.totals);
      if (allRes.ok && allJson.ok) {
        setAllClients(allJson.agreements ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, [search, agreementFilter, recordFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async bootstrap
    void load();
  }, [load]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function openDetail(clientId: number) {
    if (dirty && !window.confirm("Discard unsaved commercial changes?")) {
      return;
    }
    setSelectedId(clientId);
    setMode("idle");
    setSaveMessage(null);
    setSaveError(null);
    setFieldErrors({});
    resetActivation();
    try {
      const res = await fetch(`/api/admin/commercial-agreements/${clientId}`, {
        credentials: "same-origin",
      });
      const json = (await res.json()) as DetailResponse;
      if (!res.ok || !json.ok || !json.agreement) {
        throw new Error(json.message || "Unable to load agreement.");
      }
      setDetail(json.agreement);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to load.");
    }
  }

  async function reviewActivation() {
    if (!selectedId || activationLoading) return;
    setActivationLoading(true);
    setActivationError(null);
    setActivationResult(null);
    setActivationAcknowledged(false);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/activation-preview`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      const json = (await res.json()) as PreviewResponse;
      if (!res.ok || !json.ok || !json.preview) {
        throw new Error(json.message || "Unable to generate activation preview.");
      }
      setActivationPreview(json.preview);
      setActivationPhase("preview");
    } catch (err) {
      setActivationError(
        err instanceof Error ? err.message : "Unable to generate preview.",
      );
      setActivationPhase("preview");
    } finally {
      setActivationLoading(false);
    }
  }

  async function confirmActivation() {
    if (
      !selectedId ||
      !activationPreview ||
      !activationAcknowledged ||
      activationLoading
    ) {
      return;
    }
    setActivationLoading(true);
    setActivationError(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/activate`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previewFingerprint: activationPreview.previewFingerprint,
            confirmed: true,
          }),
        },
      );
      const json = (await res.json()) as ActivateResponse;
      if (!res.ok || !json.ok || !json.result) {
        if (json.code === "stale_preview") {
          setActivationError(
            json.message ||
              "This preview is out of date. Generate a fresh review and try again.",
          );
          setActivationPhase("preview");
          setActivationAcknowledged(false);
          return;
        }
        throw new Error(json.message || "Unable to activate.");
      }
      setActivationResult(json.result);
      setActivationPhase("result");
      if (json.result.preview) {
        setActivationPreview(json.result.preview);
      }
      if (json.result.status === "activated" || json.result.status === "already_active") {
        const detailRes = await fetch(
          `/api/admin/commercial-agreements/${selectedId}`,
          { credentials: "same-origin" },
        );
        const detailJson = (await detailRes.json()) as DetailResponse;
        if (detailRes.ok && detailJson.ok && detailJson.agreement) {
          setDetail(detailJson.agreement);
        }
        await load();
      }
    } catch (err) {
      setActivationError(
        err instanceof Error ? err.message : "Unable to activate.",
      );
    } finally {
      setActivationLoading(false);
    }
  }

  function beginEdit() {
    if (!detail) return;
    resetActivation();
    const next = draftFromRecord(detail);
    setDraft(next);
    setBaseline(next);
    setMode("edit");
    setSaveMessage(null);
    setSaveError(null);
    setFieldErrors({});
  }

  function beginCreate() {
    if (dirty && !window.confirm("Discard unsaved commercial changes?")) {
      return;
    }
    resetActivation();
    setSelectedId(null);
    setDetail(null);
    setCreateClientId("");
    const next = emptyDraft();
    setDraft(next);
    setBaseline(next);
    setMode("create");
    setSaveMessage(null);
    setSaveError(null);
    setFieldErrors({});
  }

  function cancelEdit() {
    if (dirty && !window.confirm("Discard unsaved commercial changes?")) {
      return;
    }
    setMode("idle");
    setDraft(emptyDraft());
    setBaseline(emptyDraft());
    setFieldErrors({});
    setSaveError(null);
  }

  function onAgreementChange(id: string) {
    setDraft((prev) => {
      if (!id) {
        return { ...prev, commercialAgreementId: "" };
      }
      const defaults = applyCatalogDefaults(id as CommercialAgreementId);
      return {
        ...prev,
        commercialAgreementId: id as CommercialAgreementId,
        monthlyRetainerAmount:
          defaults.monthlyRetainerAmount != null
            ? String(defaults.monthlyRetainerAmount)
            : id === "custom-legacy"
              ? prev.monthlyRetainerAmount
              : "",
        setupFee:
          defaults.setupFee != null
            ? String(defaults.setupFee)
            : id === "custom-legacy"
              ? prev.setupFee
              : "",
        monthlyServiceCredits:
          defaults.monthlyServiceCredits != null
            ? String(defaults.monthlyServiceCredits)
            : id === "custom-legacy"
              ? prev.monthlyServiceCredits
              : "",
      };
    });
  }

  function toggleAddOn(id: string) {
    setDraft((prev) => {
      const has = prev.commercialAddOns.includes(id);
      return {
        ...prev,
        commercialAddOns: has
          ? prev.commercialAddOns.filter((row) => row !== id)
          : [...prev.commercialAddOns, id],
      };
    });
  }

  async function save() {
    if (saving) return;
    const targetId =
      mode === "create"
        ? typeof createClientId === "number"
          ? createClientId
          : null
        : selectedId;
    if (!targetId) {
      setFieldErrors({ clientId: "Select a client." });
      setSaveError("Select a client.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    setFieldErrors({});
    try {
      const res = await fetch(`/api/admin/commercial-agreements/${targetId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commercialAgreementId: draft.commercialAgreementId || null,
          monthlyRetainerAmount: draft.monthlyRetainerAmount.trim() || null,
          setupFee: draft.setupFee.trim() || null,
          monthlyServiceCredits: draft.monthlyServiceCredits.trim() || null,
          commercialAddOns: draft.commercialAddOns,
          commercialNotes: draft.commercialNotes.trim() || null,
        }),
      });
      const json = (await res.json()) as DetailResponse;
      if (!res.ok || !json.ok || !json.agreement) {
        setFieldErrors(json.fieldErrors ?? {});
        throw new Error(json.message || "Unable to save.");
      }
      setDetail(json.agreement);
      setSelectedId(json.agreement.clientId);
      setMode("idle");
      setDraft(emptyDraft());
      setBaseline(emptyDraft());
      setSaveMessage(
        json.message ||
          "Commercial terms saved. Client plan and access were not changed.",
      );
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  const createCandidates = useMemo(
    () =>
      allClients
        .slice()
        .sort((a, b) => a.clientName.localeCompare(b.clientName)),
    [allClients],
  );

  const selectedAgreement = catalog.find(
    (row) => row.id === draft.commercialAgreementId,
  );
  const isCustom = draft.commercialAgreementId === "custom-legacy";

  return (
    <OperationsShell activeId="commercial-agreements">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Commercial"
          title="Commercial Agreements"
          lead="Record what was commercially proposed or agreed. Saving does not activate a client plan, change entitlements, or grant portal access."
          presence
        />

        <OpsKpiStrip
          items={[
            { label: "Clients", value: String(totals.clients) },
            { label: "Recorded", value: String(totals.recorded) },
            { label: "Unset", value: String(totals.unset) },
            {
              label: "Not provisioned",
              value: String(totals.notProvisioned),
            },
          ]}
        />

        <div className="kxd-commercial-admin__toolbar">
          <label className="kxd-commercial-admin__search">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Client or agreement"
              aria-label="Search commercial agreements"
            />
          </label>
          <label>
            <span>Package</span>
            <select
              value={agreementFilter}
              onChange={(e) => setAgreementFilter(e.target.value)}
              aria-label="Filter by package"
            >
              <option value="all">All packages</option>
              <option value="unset">Unset</option>
              {catalog.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <div className="kxd-commercial-admin__filters" role="group" aria-label="Record status">
            {(
              [
                ["all", "All"],
                ["recorded", "Recorded"],
                ["unset", "Unset"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={recordFilter === id ? "is-active" : undefined}
                onClick={() => setRecordFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="kxd-commercial-admin__new"
            onClick={beginCreate}
          >
            New agreement
          </button>
        </div>

        {error ? (
          <div className="kxd-commercial-admin__error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : null}

        <div className="kxd-commercial-admin__layout">
          <section aria-label="Agreements list">
            <OpsSectionHead label="Agreements" count={items.length} />
            {loading ? (
              <p className="kxd-commercial-admin__muted">Loading…</p>
            ) : items.length === 0 ? (
              <OpsEmpty message="No matching agreements. Adjust filters or record commercial terms for a client." />
            ) : (
              <ul className="kxd-commercial-admin__list">
                {items.map((row) => (
                  <li key={row.clientId}>
                    <button
                      type="button"
                      className={
                        selectedId === row.clientId ? "is-active" : undefined
                      }
                      onClick={() => void openDetail(row.clientId)}
                    >
                      <strong>{row.clientName}</strong>
                      <em>
                        {row.agreementName ?? "No agreement recorded"} ·{" "}
                        {commercialRecordStatusLabel(row.recordStatus)}
                      </em>
                      <span>
                        {fmtMoney(row.monthlyRetainerAmount)} ·{" "}
                        {commercialProvisioningLabel(row.provisioningState)}
                      </span>
                      <time dateTime={row.updatedAt ?? undefined}>
                        Updated {fmtDate(row.updatedAt)}
                      </time>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Agreement detail">
            <OpsSectionHead
              label={
                mode === "create"
                  ? "New agreement"
                  : mode === "edit"
                    ? "Edit agreement"
                    : "Agreement detail"
              }
            />

            {mode === "idle" && !detail ? (
              <OpsEmpty message="Select a client from the list, or start a new commercial recording." />
            ) : null}

            {mode === "create" || mode === "edit" ? (
              <div className="kxd-commercial-admin__editor">
                <p className="kxd-commercial-admin__callout">
                  Saving this agreement does not activate a client plan or change
                  access.
                </p>

                {mode === "create" ? (
                  <label className="kxd-commercial-admin__field">
                    Client
                    <select
                      value={createClientId === "" ? "" : String(createClientId)}
                      onChange={(e) =>
                        setCreateClientId(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      aria-invalid={Boolean(fieldErrors.clientId)}
                    >
                      <option value="">Select client…</option>
                      {createCandidates.map((row) => (
                        <option key={row.clientId} value={row.clientId}>
                          {row.clientName}
                          {row.recordStatus === "unset" ? " (unset)" : ""}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.clientId ? (
                      <span className="kxd-commercial-admin__field-error">
                        {fieldErrors.clientId}
                      </span>
                    ) : null}
                  </label>
                ) : null}

                <label className="kxd-commercial-admin__field">
                  Commercial agreement
                  <select
                    value={draft.commercialAgreementId}
                    onChange={(e) => onAgreementChange(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.commercialAgreementId)}
                  >
                    <option value="">Select agreement…</option>
                    {catalog.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                        {row.recommended ? " · Recommended" : ""}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.commercialAgreementId ? (
                    <span className="kxd-commercial-admin__field-error">
                      {fieldErrors.commercialAgreementId}
                    </span>
                  ) : null}
                </label>

                {selectedAgreement ? (
                  <p className="kxd-commercial-admin__muted">
                    {selectedAgreement.capabilityNote}
                    {!isCustom
                      ? ` Catalog: ${fmtMoney(selectedAgreement.monthlyStarting)} / mo · setup ${fmtMoney(selectedAgreement.setupFee)} · ${selectedAgreement.monthlyServiceCredits} credits.`
                      : " Enter negotiated values deliberately."}
                  </p>
                ) : null}

                <div className="kxd-commercial-admin__grid">
                  <label className="kxd-commercial-admin__field">
                    Monthly amount ($)
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={draft.monthlyRetainerAmount}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          monthlyRetainerAmount: e.target.value,
                        }))
                      }
                      readOnly={!isCustom && Boolean(draft.commercialAgreementId)}
                      aria-invalid={Boolean(fieldErrors.monthlyRetainerAmount)}
                    />
                    {fieldErrors.monthlyRetainerAmount ? (
                      <span className="kxd-commercial-admin__field-error">
                        {fieldErrors.monthlyRetainerAmount}
                      </span>
                    ) : null}
                  </label>
                  <label className="kxd-commercial-admin__field">
                    Setup fee ($)
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={draft.setupFee}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          setupFee: e.target.value,
                        }))
                      }
                      readOnly={!isCustom && Boolean(draft.commercialAgreementId)}
                      aria-invalid={Boolean(fieldErrors.setupFee)}
                    />
                    {fieldErrors.setupFee ? (
                      <span className="kxd-commercial-admin__field-error">
                        {fieldErrors.setupFee}
                      </span>
                    ) : null}
                  </label>
                  <label className="kxd-commercial-admin__field">
                    Monthly credits
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step="1"
                      value={draft.monthlyServiceCredits}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          monthlyServiceCredits: e.target.value,
                        }))
                      }
                      readOnly={!isCustom && Boolean(draft.commercialAgreementId)}
                      aria-invalid={Boolean(fieldErrors.monthlyServiceCredits)}
                    />
                    {fieldErrors.monthlyServiceCredits ? (
                      <span className="kxd-commercial-admin__field-error">
                        {fieldErrors.monthlyServiceCredits}
                      </span>
                    ) : null}
                  </label>
                </div>

                <fieldset className="kxd-commercial-admin__addons">
                  <legend>Approved commercial add-ons</legend>
                  <p className="kxd-commercial-admin__muted">
                    Approval records commercial intent only — it does not enable
                    modules.
                  </p>
                  <div className="kxd-commercial-admin__addon-list">
                    {PARTNERSHIP_ADD_ONS.map((addon) => (
                      <label key={addon.id}>
                        <input
                          type="checkbox"
                          checked={draft.commercialAddOns.includes(addon.id)}
                          onChange={() => toggleAddOn(addon.id)}
                        />
                        <span>{addon.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="kxd-commercial-admin__field">
                  Internal notes
                  <textarea
                    rows={4}
                    value={draft.commercialNotes}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        commercialNotes: e.target.value,
                      }))
                    }
                    aria-invalid={Boolean(fieldErrors.commercialNotes)}
                  />
                  {fieldErrors.commercialNotes ? (
                    <span className="kxd-commercial-admin__field-error">
                      {fieldErrors.commercialNotes}
                    </span>
                  ) : null}
                </label>

                <div className="kxd-commercial-admin__actions">
                  <button
                    type="button"
                    className="kxd-commercial-admin__save"
                    onClick={() => void save()}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save commercial terms"}
                  </button>
                  <button
                    type="button"
                    className="kxd-commercial-admin__text-btn"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
                {saveError ? (
                  <p className="kxd-commercial-admin__error" role="alert">
                    {saveError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {mode === "idle" && detail ? (
              <div className="kxd-commercial-admin__detail">
                <p className="kxd-commercial-admin__callout">
                  Commercial recording is separate from plan provisioning.{" "}
                  {commercialProvisioningLabel(detail.provisioningState)}.
                </p>
                <dl className="kxd-commercial-admin__meta">
                  <div>
                    <dt>Client</dt>
                    <dd>{detail.clientName}</dd>
                  </div>
                  <div>
                    <dt>Agreement</dt>
                    <dd>{detail.agreementName ?? "Unset"}</dd>
                  </div>
                  <div>
                    <dt>Record status</dt>
                    <dd>
                      {commercialRecordStatusLabel(detail.recordStatus)}
                    </dd>
                  </div>
                  <div>
                    <dt>Monthly</dt>
                    <dd>{fmtMoney(detail.monthlyRetainerAmount)}</dd>
                  </div>
                  <div>
                    <dt>Setup fee</dt>
                    <dd>{fmtMoney(detail.setupFee)}</dd>
                  </div>
                  <div>
                    <dt>Monthly credits</dt>
                    <dd>
                      {detail.monthlyServiceCredits != null
                        ? detail.monthlyServiceCredits
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Add-ons</dt>
                    <dd>
                      {detail.commercialAddOns.length
                        ? detail.commercialAddOns
                            .map((id) => commercialAddOnLabel(id))
                            .join(", ")
                        : "None"}
                    </dd>
                  </div>
                  <div>
                    <dt>Client plan (unchanged by recording)</dt>
                    <dd>
                      {detail.planKey ?? "null"} · {detail.planStatus ?? "null"}
                    </dd>
                  </div>
                  <div>
                    <dt>Provisioning</dt>
                    <dd>
                      {commercialProvisioningLabel(detail.provisioningState)}
                    </dd>
                  </div>
                  <div>
                    <dt>Notes</dt>
                    <dd>{detail.commercialNotes || "—"}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{fmtDate(detail.updatedAt)}</dd>
                  </div>
                </dl>
                <div className="kxd-commercial-admin__actions">
                  <button
                    type="button"
                    className="kxd-commercial-admin__save"
                    onClick={beginEdit}
                  >
                    Edit
                  </button>
                  {detail.recordStatus === "recorded" ? (
                    <button
                      type="button"
                      className="kxd-commercial-admin__secondary"
                      onClick={() => void reviewActivation()}
                      disabled={activationLoading}
                    >
                      {activationLoading && activationPhase === "closed"
                        ? "Preparing…"
                        : "Review activation"}
                    </button>
                  ) : (
                    <p className="kxd-commercial-admin__muted">
                      No recorded agreement available for activation.
                    </p>
                  )}
                </div>
                {saveMessage ? (
                  <p className="kxd-commercial-admin__success" role="status">
                    {saveMessage}
                  </p>
                ) : null}
                {saveError ? (
                  <p className="kxd-commercial-admin__error" role="alert">
                    {saveError}
                  </p>
                ) : null}

                {activationPhase !== "closed" ? (
                  <div
                    className="kxd-commercial-admin__activation"
                    role="region"
                    aria-label="Activation review"
                  >
                    <OpsSectionHead label="Activation review" />

                    {activationError ? (
                      <p className="kxd-commercial-admin__error" role="alert">
                        {activationError}
                      </p>
                    ) : null}

                    {activationPreview ? (
                      <>
                        <p
                          className={
                            activationPreview.eligibility === "blocked"
                              ? "kxd-commercial-admin__status kxd-commercial-admin__status--blocked"
                              : activationPreview.alreadyActive
                                ? "kxd-commercial-admin__status kxd-commercial-admin__status--active"
                                : "kxd-commercial-admin__status"
                          }
                          role="status"
                        >
                          {activationEligibilityLabel(
                            activationPreview.eligibility,
                          )}
                          {activationPreview.proposedPlanLabel
                            ? ` · ${activationPreview.proposedPlanLabel}`
                            : ""}
                        </p>

                        {activationPreview.blockers.length > 0 ? (
                          <ul className="kxd-commercial-admin__blockers">
                            {activationPreview.blockers.map((row) => (
                              <li key={row.code}>{row.message}</li>
                            ))}
                          </ul>
                        ) : null}

                        {activationPreview.warnings.length > 0 ? (
                          <ul className="kxd-commercial-admin__warnings">
                            {activationPreview.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="kxd-commercial-admin__compare">
                          <div>
                            <h3>Current access</h3>
                            <p>
                              Plan: {activationPreview.current.planKey ?? "none"}{" "}
                              · {activationPreview.current.planStatus ?? "—"}
                            </p>
                            <ul>
                              {activationPreview.current.effectiveModules.length ? (
                                activationPreview.current.effectiveModules.map(
                                  (key) => (
                                    <li key={`current-${key}`}>
                                      {activationPreview.capabilityChanges.find(
                                        (row) => row.key === key,
                                      )?.label ?? key}
                                    </li>
                                  ),
                                )
                              ) : (
                                <li>No plan-derived modules</li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <h3>After activation</h3>
                            <p>
                              Plan:{" "}
                              {activationPreview.proposed.planKey ?? "none"} ·{" "}
                              {activationPreview.proposed.planStatus ?? "—"}
                            </p>
                            <ul>
                              {activationPreview.proposed.effectiveModules
                                .length ? (
                                activationPreview.proposed.effectiveModules.map(
                                  (key) => (
                                    <li key={`proposed-${key}`}>
                                      {activationPreview.capabilityChanges.find(
                                        (row) => row.key === key,
                                      )?.label ?? key}
                                    </li>
                                  ),
                                )
                              ) : (
                                <li>No modules proposed</li>
                              )}
                            </ul>
                          </div>
                        </div>

                        <div className="kxd-commercial-admin__change-list">
                          <h3>Included with this plan</h3>
                          <ul>
                            {activationPreview.capabilityChanges.filter(
                              (row) => row.kind === "added",
                            ).length === 0 ? (
                              <li>No new modules</li>
                            ) : (
                              activationPreview.capabilityChanges
                                .filter((row) => row.kind === "added")
                                .map((row) => (
                                  <li
                                    key={`add-${row.key}`}
                                    data-kind="added"
                                  >
                                    Added · {row.label}
                                  </li>
                                ))
                            )}
                          </ul>
                          <h3>Not changed by activation</h3>
                          <ul>
                            {activationPreview.capabilityChanges
                              .filter((row) => row.kind === "unchanged")
                              .map((row) => (
                                <li
                                  key={`same-${row.key}`}
                                  data-kind="unchanged"
                                >
                                  Unchanged · {row.label}
                                </li>
                              ))}
                            {activationPreview.unchangedSystems.map((row) => (
                              <li key={row.id} data-kind="excluded">
                                Excluded · {row.label}
                              </li>
                            ))}
                          </ul>
                          {activationPreview.capabilityChanges.some(
                            (row) => row.kind === "removed",
                          ) ? (
                            <>
                              <h3>Would no longer be available</h3>
                              <ul>
                                {activationPreview.capabilityChanges
                                  .filter((row) => row.kind === "removed")
                                  .map((row) => (
                                    <li
                                      key={`rm-${row.key}`}
                                      data-kind="removed"
                                    >
                                      Removed · {row.label}
                                    </li>
                                  ))}
                              </ul>
                            </>
                          ) : null}
                        </div>

                        {activationPhase === "result" && activationResult ? (
                          <p
                            className={
                              activationResult.status === "activated" ||
                              activationResult.status === "already_active"
                                ? "kxd-commercial-admin__success"
                                : "kxd-commercial-admin__error"
                            }
                            role="status"
                          >
                            {activationResult.message}
                          </p>
                        ) : null}

                        {activationPreview.canActivate &&
                        activationPhase !== "result" ? (
                          <div className="kxd-commercial-admin__confirm">
                            <p>
                              Activation assigns{" "}
                              <strong>
                                {activationPreview.proposedPlanLabel}
                              </strong>{" "}
                              for <strong>{activationPreview.clientName}</strong>{" "}
                              from{" "}
                              <strong>
                                {activationPreview.agreementName}
                              </strong>
                              . This changes client access. It does not bill,
                              email, connect providers, create portal users, or
                              publish inventory.
                            </p>
                            <label className="kxd-commercial-admin__ack">
                              <input
                                type="checkbox"
                                checked={activationAcknowledged}
                                onChange={(e) =>
                                  setActivationAcknowledged(e.target.checked)
                                }
                                disabled={activationLoading}
                              />
                              <span>
                                I understand this will change client access for
                                this plan assignment.
                              </span>
                            </label>
                            <div className="kxd-commercial-admin__actions">
                              <button
                                type="button"
                                className="kxd-commercial-admin__save"
                                onClick={() => void confirmActivation()}
                                disabled={
                                  !activationAcknowledged || activationLoading
                                }
                              >
                                {activationLoading
                                  ? "Activating…"
                                  : "Activate plan"}
                              </button>
                              <button
                                type="button"
                                className="kxd-commercial-admin__text-btn"
                                onClick={resetActivation}
                                disabled={activationLoading}
                              >
                                Cancel review
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="kxd-commercial-admin__actions">
                            {activationPreview.alreadyActive ? (
                              <p className="kxd-commercial-admin__muted">
                                Already active — no activation needed.
                              </p>
                            ) : null}
                            <button
                              type="button"
                              className="kxd-commercial-admin__text-btn"
                              onClick={resetActivation}
                              disabled={activationLoading}
                            >
                              Close review
                            </button>
                            {activationError?.includes("out of date") ||
                            activationError?.includes("fresh") ? (
                              <button
                                type="button"
                                className="kxd-commercial-admin__secondary"
                                onClick={() => void reviewActivation()}
                                disabled={activationLoading}
                              >
                                Refresh preview
                              </button>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : activationLoading ? (
                      <p className="kxd-commercial-admin__muted">
                        Generating activation preview…
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
