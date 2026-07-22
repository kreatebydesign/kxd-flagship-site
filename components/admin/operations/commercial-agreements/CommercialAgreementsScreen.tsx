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
  confirmCustomPlanActionLabel,
  confirmPlanChangeActionLabel,
  customPlanEligibilityLabel,
  getCommercialAgreement,
  hasAgreementPlanMismatch,
  isCustomPlanCandidate,
  isLegacyConversionCandidate,
  listCommercialAgreements,
  type ActivationPreview,
  type ActivationResult,
  type ClientCommercialAgreementRecord,
  type CommercialAgreementFieldErrors,
  type CommercialAgreementId,
  type CustomPlanPreview,
  type CustomPlanResult,
  type LegacyConversionPreview,
  type LegacyConversionResult,
  type PlanChangePreview,
  type PlanChangeResult,
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

type PlanChangePreviewResponse = {
  ok?: boolean;
  message?: string;
  preview?: PlanChangePreview;
};

type PlanChangeMutationResponse = {
  ok?: boolean;
  message?: string;
  code?: string;
  result?: PlanChangeResult;
};

type LegacyConversionPreviewResponse = {
  ok?: boolean;
  message?: string;
  preview?: LegacyConversionPreview;
};

type LegacyConversionMutationResponse = {
  ok?: boolean;
  message?: string;
  code?: string;
  result?: LegacyConversionResult;
};

type CustomPlanPreviewResponse = {
  ok?: boolean;
  message?: string;
  preview?: CustomPlanPreview;
};

type CustomPlanMutationResponse = {
  ok?: boolean;
  message?: string;
  code?: string;
  result?: CustomPlanResult;
};

type EditorMode = "idle" | "edit" | "create";
type ActivationPhase = "closed" | "preview" | "result";
type PlanChangePhase = "closed" | "preview" | "result";
type LegacyConversionPhase = "closed" | "preview" | "result";
type CustomPlanPhase = "closed" | "preview" | "result";
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

  const [planChangePhase, setPlanChangePhase] =
    useState<PlanChangePhase>("closed");
  const [planChangePreview, setPlanChangePreview] =
    useState<PlanChangePreview | null>(null);
  const [planChangeResult, setPlanChangeResult] =
    useState<PlanChangeResult | null>(null);
  const [planChangeLoading, setPlanChangeLoading] = useState(false);
  const [planChangeError, setPlanChangeError] = useState<string | null>(null);
  const [planChangeAcknowledged, setPlanChangeAcknowledged] = useState(false);
  const [removalsAcknowledged, setRemovalsAcknowledged] = useState(false);

  const [legacyPhase, setLegacyPhase] =
    useState<LegacyConversionPhase>("closed");
  const [legacyPreview, setLegacyPreview] =
    useState<LegacyConversionPreview | null>(null);
  const [legacyResult, setLegacyResult] =
    useState<LegacyConversionResult | null>(null);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [legacyAcknowledged, setLegacyAcknowledged] = useState(false);

  const [customPhase, setCustomPhase] = useState<CustomPlanPhase>("closed");
  const [customPreview, setCustomPreview] = useState<CustomPlanPreview | null>(
    null,
  );
  const [customResult, setCustomResult] = useState<CustomPlanResult | null>(
    null,
  );
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [customAcknowledged, setCustomAcknowledged] = useState(false);
  const [customRemovalsAcknowledged, setCustomRemovalsAcknowledged] =
    useState(false);
  const [customSelectedModules, setCustomSelectedModules] = useState<string[]>(
    [],
  );

  const dirty = mode !== "idle" && !draftsEqual(draft, baseline);

  function resetActivation() {
    setActivationPhase("closed");
    setActivationPreview(null);
    setActivationResult(null);
    setActivationLoading(false);
    setActivationError(null);
    setActivationAcknowledged(false);
  }

  function resetPlanChange() {
    setPlanChangePhase("closed");
    setPlanChangePreview(null);
    setPlanChangeResult(null);
    setPlanChangeLoading(false);
    setPlanChangeError(null);
    setPlanChangeAcknowledged(false);
    setRemovalsAcknowledged(false);
  }

  function resetLegacyConversion() {
    setLegacyPhase("closed");
    setLegacyPreview(null);
    setLegacyResult(null);
    setLegacyLoading(false);
    setLegacyError(null);
    setLegacyAcknowledged(false);
  }

  function resetCustomPlan() {
    setCustomPhase("closed");
    setCustomPreview(null);
    setCustomResult(null);
    setCustomLoading(false);
    setCustomError(null);
    setCustomAcknowledged(false);
    setCustomRemovalsAcknowledged(false);
    setCustomSelectedModules([]);
  }

  function resetReviews() {
    resetActivation();
    resetPlanChange();
    resetLegacyConversion();
    resetCustomPlan();
  }

  const anyReviewLoading =
    activationLoading || planChangeLoading || legacyLoading || customLoading;

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
    resetReviews();
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
    if (!selectedId || anyReviewLoading) {
      return;
    }
    resetPlanChange();
    resetLegacyConversion();
    resetCustomPlan();
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

  async function reviewPlanChange() {
    if (!selectedId || anyReviewLoading) {
      return;
    }
    resetActivation();
    resetLegacyConversion();
    resetCustomPlan();
    setPlanChangeLoading(true);
    setPlanChangeError(null);
    setPlanChangeResult(null);
    setPlanChangeAcknowledged(false);
    setRemovalsAcknowledged(false);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/plan-change-preview`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      const json = (await res.json()) as PlanChangePreviewResponse;
      if (!res.ok || !json.ok || !json.preview) {
        throw new Error(json.message || "Unable to generate plan-change preview.");
      }
      setPlanChangePreview(json.preview);
      setPlanChangePhase("preview");
    } catch (err) {
      setPlanChangeError(
        err instanceof Error ? err.message : "Unable to generate preview.",
      );
      setPlanChangePhase("preview");
    } finally {
      setPlanChangeLoading(false);
    }
  }

  async function confirmPlanChange() {
    if (
      !selectedId ||
      !planChangePreview ||
      !planChangeAcknowledged ||
      planChangeLoading
    ) {
      return;
    }
    if (planChangePreview.hasRemovals && !removalsAcknowledged) {
      setPlanChangeError(
        "Acknowledge module removals before confirming this plan change.",
      );
      return;
    }
    setPlanChangeLoading(true);
    setPlanChangeError(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/change-plan`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previewFingerprint: planChangePreview.previewFingerprint,
            confirmed: true,
            removalsAcknowledged: planChangePreview.hasRemovals
              ? removalsAcknowledged
              : false,
          }),
        },
      );
      const json = (await res.json()) as PlanChangeMutationResponse;
      if (!res.ok || !json.ok || !json.result) {
        if (json.code === "stale_preview") {
          setPlanChangeError(
            json.message ||
              "This preview is out of date. Generate a fresh review and try again.",
          );
          setPlanChangePhase("preview");
          setPlanChangeAcknowledged(false);
          setRemovalsAcknowledged(false);
          return;
        }
        throw new Error(json.message || "Unable to change plan.");
      }
      setPlanChangeResult(json.result);
      setPlanChangePhase("result");
      if (json.result.preview) {
        setPlanChangePreview(json.result.preview);
      }
      if (json.result.status === "changed" || json.result.status === "aligned") {
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
      setPlanChangeError(
        err instanceof Error ? err.message : "Unable to change plan.",
      );
    } finally {
      setPlanChangeLoading(false);
    }
  }

  async function reviewLegacyConversion() {
    if (!selectedId || anyReviewLoading) {
      return;
    }
    resetActivation();
    resetPlanChange();
    resetCustomPlan();
    setLegacyLoading(true);
    setLegacyError(null);
    setLegacyResult(null);
    setLegacyAcknowledged(false);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/legacy-conversion-preview`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      const json = (await res.json()) as LegacyConversionPreviewResponse;
      if (!res.ok || !json.ok || !json.preview) {
        throw new Error(
          json.message || "Unable to generate legacy-conversion preview.",
        );
      }
      setLegacyPreview(json.preview);
      setLegacyPhase("preview");
    } catch (err) {
      setLegacyError(
        err instanceof Error ? err.message : "Unable to generate preview.",
      );
      setLegacyPhase("preview");
    } finally {
      setLegacyLoading(false);
    }
  }

  async function confirmLegacyConversion() {
    if (
      !selectedId ||
      !legacyPreview ||
      !legacyAcknowledged ||
      legacyLoading
    ) {
      return;
    }
    setLegacyLoading(true);
    setLegacyError(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/convert-legacy`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previewFingerprint: legacyPreview.previewFingerprint,
            confirmed: true,
          }),
        },
      );
      const json = (await res.json()) as LegacyConversionMutationResponse;
      if (!res.ok || !json.ok || !json.result) {
        if (json.code === "stale_preview") {
          setLegacyError(
            json.message ||
              "This preview is out of date. Generate a fresh review and try again.",
          );
          setLegacyPhase("preview");
          setLegacyAcknowledged(false);
          return;
        }
        throw new Error(json.message || "Unable to convert legacy client.");
      }
      setLegacyResult(json.result);
      setLegacyPhase("result");
      if (json.result.preview) {
        setLegacyPreview(json.result.preview);
      }
      if (
        json.result.status === "converted" ||
        json.result.status === "already_converted"
      ) {
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
      setLegacyError(
        err instanceof Error ? err.message : "Unable to convert.",
      );
    } finally {
      setLegacyLoading(false);
    }
  }

  async function reviewCustomPlan(modules?: string[] | null) {
    if (!selectedId || anyReviewLoading) {
      return;
    }
    resetActivation();
    resetPlanChange();
    resetLegacyConversion();
    setCustomLoading(true);
    setCustomError(null);
    setCustomResult(null);
    setCustomAcknowledged(false);
    setCustomRemovalsAcknowledged(false);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/custom-plan-preview`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            modules == null ? {} : { requestedModules: modules },
          ),
        },
      );
      const json = (await res.json()) as CustomPlanPreviewResponse;
      if (!res.ok || !json.ok || !json.preview) {
        throw new Error(
          json.message || "Unable to generate custom-plan preview.",
        );
      }
      setCustomPreview(json.preview);
      setCustomSelectedModules(
        json.preview.proposedEffectiveModules.map((row) => row.key),
      );
      setCustomPhase("preview");
    } catch (err) {
      setCustomError(
        err instanceof Error ? err.message : "Unable to generate preview.",
      );
      setCustomPhase("preview");
    } finally {
      setCustomLoading(false);
    }
  }

  function toggleCustomModule(key: string) {
    setCustomSelectedModules((prev) => {
      if (prev.includes(key)) return prev.filter((row) => row !== key);
      return [...prev, key].sort();
    });
    setCustomAcknowledged(false);
    setCustomRemovalsAcknowledged(false);
  }

  async function confirmCustomPlan() {
    if (
      !selectedId ||
      !customPreview ||
      !customAcknowledged ||
      customLoading
    ) {
      return;
    }
    if (customPreview.hasRemovals && !customRemovalsAcknowledged) {
      return;
    }
    setCustomLoading(true);
    setCustomError(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/apply-custom-plan`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previewFingerprint: customPreview.previewFingerprint,
            confirmed: true,
            removalsAcknowledged: customPreview.hasRemovals
              ? customRemovalsAcknowledged
              : false,
            requestedModules: customSelectedModules,
          }),
        },
      );
      const json = (await res.json()) as CustomPlanMutationResponse;
      if (!res.ok || !json.ok || !json.result) {
        if (json.code === "stale_preview") {
          setCustomError(
            json.message ||
              "This preview is out of date. Refresh the review and try again.",
          );
          setCustomPhase("preview");
          setCustomAcknowledged(false);
          setCustomRemovalsAcknowledged(false);
          return;
        }
        throw new Error(json.message || "Unable to apply custom plan.");
      }
      setCustomResult(json.result);
      setCustomPhase("result");
      if (json.result.preview) {
        setCustomPreview(json.result.preview);
        setCustomSelectedModules(
          json.result.preview.proposedEffectiveModules.map((row) => row.key),
        );
      }
      if (
        json.result.status === "activated" ||
        json.result.status === "changed" ||
        json.result.status === "aligned"
      ) {
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
      setCustomError(
        err instanceof Error ? err.message : "Unable to apply custom plan.",
      );
    } finally {
      setCustomLoading(false);
    }
  }

  function beginEdit() {
    if (!detail) return;
    resetReviews();
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
    resetReviews();
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

  const detailAgreementPlan = detail?.commercialAgreementId
    ? getCommercialAgreement(detail.commercialAgreementId)
    : null;
  const planMismatch = detail
    ? hasAgreementPlanMismatch({
        commercialAgreementId: detail.commercialAgreementId,
        planKey: detail.planKey,
        planStatus: detail.planStatus,
      })
    : false;
  const showLegacyConversion =
    Boolean(detail) &&
    isLegacyConversionCandidate({
      commercialAgreementId: detail!.commercialAgreementId,
      planKey: detail!.planKey,
      planStatus: detail!.planStatus,
    });
  const showLegacyNeedsAgreement =
    Boolean(detail) &&
    !detail!.planKey &&
    detail!.planStatus === "legacy" &&
    !detail!.commercialAgreementId;
  const showFirstTimeActivation = false;
  const showPlanChangeAction =
    Boolean(detail) &&
    detail!.recordStatus === "recorded" &&
    planMismatch;
  const showCustomPlanAction =
    Boolean(detail) &&
    detail!.recordStatus === "recorded" &&
    isCustomPlanCandidate({
      commercialAgreementId: detail!.commercialAgreementId,
      planStatus: detail!.planStatus,
    });
  const customSelectionNeedsRefresh =
    Boolean(customPreview) &&
    customSelectedModules.slice().sort().join(",") !==
      customPreview!.proposedEffectiveModules
        .map((row) => row.key)
        .slice()
        .sort()
        .join(",");
  const isExistingCustomAssignment =
    detail?.planKey === "custom" &&
    (detail.planStatus === "active" || detail.planStatus === "trial");

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
                    <dt>Agreement plan</dt>
                    <dd>
                      {detailAgreementPlan?.entitlementPresetId
                        ? `${detailAgreementPlan.entitlementPresetId}${
                            planMismatch
                              ? " · Plan change available"
                              : showLegacyConversion
                                ? " · Legacy conversion available"
                                : showCustomPlanAction
                                  ? isExistingCustomAssignment
                                    ? " · Custom plan review available"
                                    : " · Custom plan setup available"
                                  : ""
                          }`
                        : detail.commercialAgreementId
                          ? "Manual review required"
                          : "—"}
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
                  {showLegacyConversion ? (
                    <button
                      type="button"
                      className="kxd-commercial-admin__secondary"
                      onClick={() => void reviewLegacyConversion()}
                      disabled={anyReviewLoading}
                    >
                      {legacyLoading && legacyPhase === "closed"
                        ? "Preparing…"
                        : "Review legacy conversion"}
                    </button>
                  ) : null}
                  {showFirstTimeActivation ? (
                    <button
                      type="button"
                      className="kxd-commercial-admin__secondary"
                      onClick={() => void reviewActivation()}
                      disabled={anyReviewLoading}
                    >
                      {activationLoading && activationPhase === "closed"
                        ? "Preparing…"
                        : "Review activation"}
                    </button>
                  ) : null}
                  {showPlanChangeAction ? (
                    <button
                      type="button"
                      className="kxd-commercial-admin__secondary"
                      onClick={() => void reviewPlanChange()}
                      disabled={anyReviewLoading}
                    >
                      {planChangeLoading && planChangePhase === "closed"
                        ? "Preparing…"
                        : "Review plan change"}
                    </button>
                  ) : null}
                  {showCustomPlanAction ? (
                    <button
                      type="button"
                      className="kxd-commercial-admin__secondary"
                      onClick={() => void reviewCustomPlan(null)}
                      disabled={anyReviewLoading}
                    >
                      {customLoading && customPhase === "closed"
                        ? "Preparing…"
                        : isExistingCustomAssignment
                          ? "Review custom plan"
                          : "Build custom plan"}
                    </button>
                  ) : null}
                  {showLegacyNeedsAgreement ? (
                    <p className="kxd-commercial-admin__muted">
                      Record a standard agreement before legacy conversion.
                    </p>
                  ) : null}
                  {detail.recordStatus !== "recorded" &&
                  !showLegacyNeedsAgreement ? (
                    <p className="kxd-commercial-admin__muted">
                      No recorded agreement available for activation.
                    </p>
                  ) : null}
                  {detail.recordStatus === "recorded" &&
                  detail.planKey &&
                  detail.planKey !== "custom" &&
                  !planMismatch &&
                  (detail.planStatus === "active" ||
                    detail.planStatus === "trial") ? (
                    <p className="kxd-commercial-admin__muted">
                      Plan already aligned with the recorded agreement.
                    </p>
                  ) : null}
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

                {planChangePhase !== "closed" ? (
                  <div
                    className="kxd-commercial-admin__activation"
                    role="region"
                    aria-label="Plan change review"
                  >
                    <OpsSectionHead label="Plan change review" />

                    {planChangeError ? (
                      <p className="kxd-commercial-admin__error" role="alert">
                        {planChangeError}
                      </p>
                    ) : null}

                    {planChangePreview ? (
                      <>
                        <p
                          className={
                            planChangePreview.eligibility === "blocked" ||
                            planChangePreview.eligibility === "use_activation"
                              ? "kxd-commercial-admin__status kxd-commercial-admin__status--blocked"
                              : planChangePreview.alreadyAligned
                                ? "kxd-commercial-admin__status kxd-commercial-admin__status--active"
                                : planChangePreview.classification ===
                                    "downgrade"
                                  ? "kxd-commercial-admin__status kxd-commercial-admin__status--blocked"
                                  : "kxd-commercial-admin__status"
                          }
                          role="status"
                        >
                          {planChangePreview.classificationLabel ??
                            "Plan change"}
                          {planChangePreview.proposedPlanLabel
                            ? ` · ${planChangePreview.currentPlanLabel ?? "none"} → ${planChangePreview.proposedPlanLabel}`
                            : ""}
                        </p>

                        {planChangePreview.blockers.length > 0 ? (
                          <ul className="kxd-commercial-admin__blockers">
                            {planChangePreview.blockers.map((row) => (
                              <li key={row.code}>{row.message}</li>
                            ))}
                          </ul>
                        ) : null}

                        {planChangePreview.warnings.length > 0 ? (
                          <ul className="kxd-commercial-admin__warnings">
                            {planChangePreview.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="kxd-commercial-admin__compare">
                          <div>
                            <h3>Current plan</h3>
                            <p>
                              {planChangePreview.currentPlanLabel ??
                                planChangePreview.current.planKey ??
                                "none"}{" "}
                              · {planChangePreview.currentPlanStatus ?? "—"}
                            </p>
                            <ul>
                              {planChangePreview.current.effectiveModules
                                .length ? (
                                planChangePreview.current.effectiveModules.map(
                                  (key) => (
                                    <li key={`pc-current-${key}`}>
                                      {planChangePreview.capabilityChanges.find(
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
                            <h3>After plan change</h3>
                            <p>
                              {planChangePreview.proposedPlanLabel ??
                                planChangePreview.proposed.planKey ??
                                "none"}{" "}
                              · {planChangePreview.proposedPlanStatus ?? "—"}
                            </p>
                            <ul>
                              {planChangePreview.proposed.effectiveModules
                                .length ? (
                                planChangePreview.proposed.effectiveModules.map(
                                  (key) => (
                                    <li key={`pc-proposed-${key}`}>
                                      {planChangePreview.capabilityChanges.find(
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
                          <h3>Added with this plan</h3>
                          <ul>
                            {planChangePreview.capabilityChanges.filter(
                              (row) => row.kind === "added",
                            ).length === 0 ? (
                              <li>No new modules</li>
                            ) : (
                              planChangePreview.capabilityChanges
                                .filter((row) => row.kind === "added")
                                .map((row) => (
                                  <li
                                    key={`pc-add-${row.key}`}
                                    data-kind="added"
                                  >
                                    Added · {row.label}
                                  </li>
                                ))
                            )}
                          </ul>
                          <h3>Still included</h3>
                          <ul>
                            {planChangePreview.capabilityChanges.filter(
                              (row) => row.kind === "unchanged",
                            ).length === 0 ? (
                              <li>None</li>
                            ) : (
                              planChangePreview.capabilityChanges
                                .filter((row) => row.kind === "unchanged")
                                .map((row) => (
                                  <li
                                    key={`pc-same-${row.key}`}
                                    data-kind="unchanged"
                                  >
                                    Still included · {row.label}
                                  </li>
                                ))
                            )}
                          </ul>
                          {planChangePreview.hasRemovals ? (
                            <>
                              <h3>No longer included</h3>
                              <ul>
                                {planChangePreview.capabilityChanges
                                  .filter((row) => row.kind === "removed")
                                  .map((row) => (
                                    <li
                                      key={`pc-rm-${row.key}`}
                                      data-kind="removed"
                                    >
                                      Removed · {row.label}
                                    </li>
                                  ))}
                              </ul>
                            </>
                          ) : null}
                          <h3>Not changed</h3>
                          <ul>
                            {planChangePreview.unchangedSystems.map((row) => (
                              <li key={row.id} data-kind="excluded">
                                Excluded · {row.label}
                              </li>
                            ))}
                          </ul>
                          <p className="kxd-commercial-admin__muted">
                            {planChangePreview.moduleDataNote}
                          </p>
                          <p className="kxd-commercial-admin__muted">
                            {planChangePreview.overrideHandling}
                          </p>
                        </div>

                        {planChangePhase === "result" && planChangeResult ? (
                          <p
                            className={
                              planChangeResult.status === "changed" ||
                              planChangeResult.status === "aligned"
                                ? "kxd-commercial-admin__success"
                                : "kxd-commercial-admin__error"
                            }
                            role="status"
                          >
                            {planChangeResult.message}
                          </p>
                        ) : null}

                        {planChangePreview.canChange &&
                        planChangePhase !== "result" ? (
                          <div className="kxd-commercial-admin__confirm">
                            <p>
                              This {planChangePreview.classificationLabel?.toLowerCase() ?? "plan change"}{" "}
                              moves <strong>{planChangePreview.clientName}</strong>{" "}
                              from{" "}
                              <strong>
                                {planChangePreview.currentPlanLabel}
                              </strong>{" "}
                              to{" "}
                              <strong>
                                {planChangePreview.proposedPlanLabel}
                              </strong>
                              . Client access will change. Billing, providers,
                              and infrastructure are not changed.
                            </p>
                            <label className="kxd-commercial-admin__ack">
                              <input
                                type="checkbox"
                                checked={planChangeAcknowledged}
                                onChange={(e) =>
                                  setPlanChangeAcknowledged(e.target.checked)
                                }
                                disabled={planChangeLoading}
                              />
                              <span>
                                I understand this will change client access for
                                this plan assignment.
                              </span>
                            </label>
                            {planChangePreview.hasRemovals ? (
                              <label className="kxd-commercial-admin__ack">
                                <input
                                  type="checkbox"
                                  checked={removalsAcknowledged}
                                  onChange={(e) =>
                                    setRemovalsAcknowledged(e.target.checked)
                                  }
                                  disabled={planChangeLoading}
                                />
                                <span>
                                  I understand that the listed modules will no
                                  longer be included in this client’s plan.
                                </span>
                              </label>
                            ) : null}
                            <div className="kxd-commercial-admin__actions">
                              <button
                                type="button"
                                className="kxd-commercial-admin__save"
                                onClick={() => void confirmPlanChange()}
                                disabled={
                                  !planChangeAcknowledged ||
                                  (planChangePreview.hasRemovals &&
                                    !removalsAcknowledged) ||
                                  planChangeLoading
                                }
                              >
                                {planChangeLoading
                                  ? "Updating…"
                                  : confirmPlanChangeActionLabel(
                                      planChangePreview.classification,
                                    )}
                              </button>
                              <button
                                type="button"
                                className="kxd-commercial-admin__text-btn"
                                onClick={resetPlanChange}
                                disabled={planChangeLoading}
                              >
                                Cancel review
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="kxd-commercial-admin__actions">
                            {planChangePreview.alreadyAligned ? (
                              <p className="kxd-commercial-admin__muted">
                                Plan already aligned — no change needed.
                              </p>
                            ) : null}
                            <button
                              type="button"
                              className="kxd-commercial-admin__text-btn"
                              onClick={resetPlanChange}
                              disabled={planChangeLoading}
                            >
                              Close review
                            </button>
                            {planChangeError?.includes("out of date") ||
                            planChangeError?.includes("fresh") ? (
                              <button
                                type="button"
                                className="kxd-commercial-admin__secondary"
                                onClick={() => void reviewPlanChange()}
                                disabled={planChangeLoading}
                              >
                                Refresh preview
                              </button>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : planChangeLoading ? (
                      <p className="kxd-commercial-admin__muted">
                        Generating plan-change preview…
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {legacyPhase !== "closed" ? (
                  <div
                    className="kxd-commercial-admin__activation"
                    role="region"
                    aria-label="Legacy conversion review"
                  >
                    <OpsSectionHead label="Legacy conversion review" />

                    {legacyError ? (
                      <p className="kxd-commercial-admin__error" role="alert">
                        {legacyError}
                      </p>
                    ) : null}

                    {legacyPreview ? (
                      <>
                        <p
                          className={
                            legacyPreview.canConvert
                              ? "kxd-commercial-admin__status kxd-commercial-admin__status--active"
                              : legacyPreview.alreadyConverted
                                ? "kxd-commercial-admin__status kxd-commercial-admin__status--active"
                                : "kxd-commercial-admin__status kxd-commercial-admin__status--blocked"
                          }
                          role="status"
                        >
                          {legacyPreview.canConvert
                            ? "Legacy conversion available"
                            : legacyPreview.alreadyConverted
                              ? "Already converted"
                              : "Manual review required"}
                          {legacyPreview.proposedPlanLabel
                            ? ` · ${legacyPreview.proposedPlanLabel}`
                            : ""}
                          {legacyPreview.noAccessLoss && legacyPreview.canConvert
                            ? " · No access removed"
                            : ""}
                        </p>

                        {legacyPreview.blockers.length > 0 ? (
                          <ul className="kxd-commercial-admin__blockers">
                            {legacyPreview.blockers.map((row) => (
                              <li key={row.code}>{row.message}</li>
                            ))}
                          </ul>
                        ) : null}

                        {legacyPreview.warnings.length > 0 ? (
                          <ul className="kxd-commercial-admin__warnings">
                            {legacyPreview.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="kxd-commercial-admin__compare">
                          <div>
                            <h3>Current legacy access</h3>
                            <p>
                              Plan:{" "}
                              {legacyPreview.currentPlanKey ?? "none"} ·{" "}
                              {legacyPreview.currentPlanStatus ?? "—"}
                            </p>
                            <ul>
                              {legacyPreview.currentLegacyModules.length ? (
                                legacyPreview.currentLegacyModules.map((row) => (
                                  <li key={`lg-cur-${row.key}`}>{row.label}</li>
                                ))
                              ) : (
                                <li>No current portal modules</li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <h3>Proposed modern plan</h3>
                            <p>
                              {legacyPreview.proposedPlanLabel ??
                                legacyPreview.proposedPlanKey ??
                                "none"}{" "}
                              · {legacyPreview.proposedPlanStatus ?? "—"}
                            </p>
                            <ul>
                              {legacyPreview.proposedEffectiveModules.length ? (
                                legacyPreview.proposedEffectiveModules.map(
                                  (row) => (
                                    <li key={`lg-prop-${row.key}`}>
                                      {row.label}
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
                          <h3>Included with the plan</h3>
                          <ul>
                            {legacyPreview.targetBaselineModules.length ? (
                              legacyPreview.targetBaselineModules.map((row) => (
                                <li
                                  key={`lg-base-${row.key}`}
                                  data-kind="unchanged"
                                >
                                  Plan · {row.label}
                                </li>
                              ))
                            ) : (
                              <li>None</li>
                            )}
                          </ul>
                          <h3>Preserved from the current setup</h3>
                          <ul>
                            {legacyPreview.preservedAsAddOns.length ? (
                              legacyPreview.preservedAsAddOns.map((row) => (
                                <li
                                  key={`lg-keep-${row.key}`}
                                  data-kind="unchanged"
                                >
                                  Preserved · {row.label}
                                </li>
                              ))
                            ) : (
                              <li>None required — current access fits the plan</li>
                            )}
                          </ul>
                          <h3>Newly included</h3>
                          <ul>
                            {legacyPreview.newlyIncluded.length ? (
                              legacyPreview.newlyIncluded.map((row) => (
                                <li
                                  key={`lg-new-${row.key}`}
                                  data-kind="added"
                                >
                                  Newly included · {row.label}
                                </li>
                              ))
                            ) : (
                              <li>No new modules</li>
                            )}
                          </ul>
                          <h3>Not changed</h3>
                          <ul>
                            {legacyPreview.unchangedSystems.map((row) => (
                              <li key={row.id} data-kind="excluded">
                                Excluded · {row.label}
                              </li>
                            ))}
                          </ul>
                          <p className="kxd-commercial-admin__muted">
                            {legacyPreview.moduleDataNote}
                          </p>
                          <p className="kxd-commercial-admin__muted">
                            {legacyPreview.overrideHandling}
                          </p>
                        </div>

                        {legacyPhase === "result" && legacyResult ? (
                          <p
                            className={
                              legacyResult.status === "converted" ||
                              legacyResult.status === "already_converted"
                                ? "kxd-commercial-admin__success"
                                : "kxd-commercial-admin__error"
                            }
                            role="status"
                          >
                            {legacyResult.message}
                          </p>
                        ) : null}

                        {legacyPreview.canConvert &&
                        legacyPhase !== "result" ? (
                          <div className="kxd-commercial-admin__confirm">
                            <p>
                              Conversion assigns{" "}
                              <strong>
                                {legacyPreview.proposedPlanLabel}
                              </strong>{" "}
                              for <strong>{legacyPreview.clientName}</strong>{" "}
                              while preserving current legacy access. No current
                              access will be removed. Billing, providers, and
                              infrastructure are not changed.
                            </p>
                            <label className="kxd-commercial-admin__ack">
                              <input
                                type="checkbox"
                                checked={legacyAcknowledged}
                                onChange={(e) =>
                                  setLegacyAcknowledged(e.target.checked)
                                }
                                disabled={legacyLoading}
                              />
                              <span>
                                I reviewed the proposed modern plan and the
                                legacy access that will be preserved for this
                                client.
                              </span>
                            </label>
                            <div className="kxd-commercial-admin__actions">
                              <button
                                type="button"
                                className="kxd-commercial-admin__save"
                                onClick={() => void confirmLegacyConversion()}
                                disabled={
                                  !legacyAcknowledged || legacyLoading
                                }
                              >
                                {legacyLoading
                                  ? "Converting…"
                                  : "Confirm conversion"}
                              </button>
                              <button
                                type="button"
                                className="kxd-commercial-admin__text-btn"
                                onClick={resetLegacyConversion}
                                disabled={legacyLoading}
                              >
                                Cancel review
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="kxd-commercial-admin__actions">
                            <button
                              type="button"
                              className="kxd-commercial-admin__text-btn"
                              onClick={resetLegacyConversion}
                              disabled={legacyLoading}
                            >
                              Close review
                            </button>
                            {legacyError?.includes("out of date") ||
                            legacyError?.includes("fresh") ? (
                              <button
                                type="button"
                                className="kxd-commercial-admin__secondary"
                                onClick={() => void reviewLegacyConversion()}
                                disabled={legacyLoading}
                              >
                                Refresh preview
                              </button>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : legacyLoading ? (
                      <p className="kxd-commercial-admin__muted">
                        Generating legacy-conversion preview…
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {customPhase !== "closed" ? (
                  <div
                    className="kxd-commercial-admin__activation"
                    role="region"
                    aria-label="Custom plan review"
                  >
                    <OpsSectionHead label="Custom plan review" />

                    {customError ? (
                      <p className="kxd-commercial-admin__error" role="alert">
                        {customError}
                      </p>
                    ) : null}

                    {customPreview ? (
                      <>
                        <p
                          className={
                            customPreview.eligibility === "blocked" ||
                            customPreview.eligibility === "use_standard_flow"
                              ? "kxd-commercial-admin__status kxd-commercial-admin__status--blocked"
                              : customPreview.alreadyAligned
                                ? "kxd-commercial-admin__status kxd-commercial-admin__status--active"
                                : "kxd-commercial-admin__status"
                          }
                          role="status"
                        >
                          {customPlanEligibilityLabel(customPreview.eligibility)}
                          {customPreview.operation === "revise"
                            ? " · Revision"
                            : customPreview.operation === "activate"
                              ? " · First custom activation"
                              : ""}
                        </p>

                        {customPreview.blockers.length > 0 ? (
                          <ul className="kxd-commercial-admin__blockers">
                            {customPreview.blockers.map((row) => (
                              <li key={row.code}>{row.message}</li>
                            ))}
                          </ul>
                        ) : null}

                        {customPreview.warnings.length > 0 ? (
                          <ul className="kxd-commercial-admin__warnings">
                            {customPreview.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="kxd-commercial-admin__compare">
                          <div>
                            <h3>Current access</h3>
                            <p>
                              Plan: {customPreview.currentPlanKey ?? "none"} ·{" "}
                              {customPreview.currentPlanStatus ?? "—"}
                            </p>
                            <ul>
                              {customPreview.currentEffectiveModules.length ? (
                                customPreview.currentEffectiveModules.map(
                                  (row) => (
                                    <li key={`cp-cur-${row.key}`}>
                                      {row.label}
                                    </li>
                                  ),
                                )
                              ) : (
                                <li>No current modules</li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <h3>Proposed access</h3>
                            <p>
                              custom · {customPreview.proposedPlanStatus ?? "—"}
                            </p>
                            <ul>
                              {customPreview.proposedEffectiveModules.length ? (
                                customPreview.proposedEffectiveModules.map(
                                  (row) => (
                                    <li key={`cp-prop-${row.key}`}>
                                      {row.label}
                                    </li>
                                  ),
                                )
                              ) : (
                                <li>No modules proposed</li>
                              )}
                            </ul>
                          </div>
                        </div>

                        <fieldset className="kxd-commercial-admin__addons kxd-commercial-admin__module-picker">
                          <legend>Selectable modules</legend>
                          <p className="kxd-commercial-admin__muted">
                            {customPreview.accessNote}
                          </p>
                          <div className="kxd-commercial-admin__addon-list">
                            {customPreview.selectableModules.map((row) => {
                              const checked = customSelectedModules.includes(
                                row.key,
                              );
                              const stateLabel = row.currentlyIncluded
                                ? checked
                                  ? "Currently included"
                                  : "No longer included"
                                : checked
                                  ? "Newly included"
                                  : "Not included";
                              return (
                                <label key={row.key}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleCustomModule(row.key)}
                                    disabled={
                                      customLoading || customPhase === "result"
                                    }
                                  />
                                  <span>
                                    <strong>{row.label}</strong>
                                    <em data-kind={stateLabel}>
                                      {" "}
                                      · {stateLabel}
                                    </em>
                                    <br />
                                    <span className="kxd-commercial-admin__muted">
                                      {row.description}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          {customSelectionNeedsRefresh ? (
                            <div className="kxd-commercial-admin__actions">
                              <button
                                type="button"
                                className="kxd-commercial-admin__secondary"
                                onClick={() =>
                                  void reviewCustomPlan(customSelectedModules)
                                }
                                disabled={customLoading}
                              >
                                {customLoading
                                  ? "Updating preview…"
                                  : "Update preview"}
                              </button>
                            </div>
                          ) : null}
                        </fieldset>

                        <div className="kxd-commercial-admin__change-list">
                          <h3>Newly included</h3>
                          <ul>
                            {customPreview.addedModules.length ? (
                              customPreview.addedModules.map((row) => (
                                <li key={`cp-add-${row.key}`} data-kind="added">
                                  Newly included · {row.label}
                                </li>
                              ))
                            ) : (
                              <li>None</li>
                            )}
                          </ul>
                          <h3>No longer included</h3>
                          <ul>
                            {customPreview.removedModules.length ? (
                              customPreview.removedModules.map((row) => (
                                <li
                                  key={`cp-rem-${row.key}`}
                                  data-kind="removed"
                                >
                                  No longer included · {row.label}
                                </li>
                              ))
                            ) : (
                              <li>None</li>
                            )}
                          </ul>
                          <h3>Unchanged</h3>
                          <ul>
                            {customPreview.unchangedModules.length ? (
                              customPreview.unchangedModules.map((row) => (
                                <li
                                  key={`cp-same-${row.key}`}
                                  data-kind="unchanged"
                                >
                                  Unchanged · {row.label}
                                </li>
                              ))
                            ) : (
                              <li>None</li>
                            )}
                          </ul>
                          <h3>Systems unchanged</h3>
                          <ul>
                            {customPreview.unchangedSystems.map((row) => (
                              <li key={row.id} data-kind="excluded">
                                Excluded · {row.label}
                              </li>
                            ))}
                          </ul>
                          <p className="kxd-commercial-admin__muted">
                            {customPreview.moduleDataNote}
                          </p>
                          <p className="kxd-commercial-admin__muted">
                            Commercial agreement and commercial values remain
                            unchanged. Billing is not configured or changed.
                          </p>
                        </div>

                        {customPhase === "result" && customResult ? (
                          <p
                            className={
                              customResult.status === "activated" ||
                              customResult.status === "changed" ||
                              customResult.status === "aligned"
                                ? "kxd-commercial-admin__success"
                                : "kxd-commercial-admin__error"
                            }
                            role="status"
                          >
                            {customResult.message}
                          </p>
                        ) : null}

                        {customPreview.canApply &&
                        customPhase !== "result" &&
                        !customSelectionNeedsRefresh ? (
                          <div className="kxd-commercial-admin__confirm">
                            <p>
                              Confirm custom access for{" "}
                              <strong>{customPreview.clientName}</strong>. Access
                              changes only. Commercial terms, billing, providers,
                              and infrastructure are not changed.
                            </p>
                            <label className="kxd-commercial-admin__ack">
                              <input
                                type="checkbox"
                                checked={customAcknowledged}
                                onChange={(e) =>
                                  setCustomAcknowledged(e.target.checked)
                                }
                                disabled={customLoading}
                              />
                              <span>
                                I reviewed the proposed custom access, commercial
                                agreement, and systems that will remain unchanged.
                              </span>
                            </label>
                            {customPreview.hasRemovals ? (
                              <label className="kxd-commercial-admin__ack">
                                <input
                                  type="checkbox"
                                  checked={customRemovalsAcknowledged}
                                  onChange={(e) =>
                                    setCustomRemovalsAcknowledged(
                                      e.target.checked,
                                    )
                                  }
                                  disabled={customLoading}
                                />
                                <span>
                                  I understand that the listed modules will no
                                  longer be included in this client’s access.
                                  Existing module data will not be deleted by this
                                  change.
                                </span>
                              </label>
                            ) : null}
                            <div className="kxd-commercial-admin__actions">
                              <button
                                type="button"
                                className="kxd-commercial-admin__save"
                                onClick={() => void confirmCustomPlan()}
                                disabled={
                                  !customAcknowledged ||
                                  customLoading ||
                                  (customPreview.hasRemovals &&
                                    !customRemovalsAcknowledged)
                                }
                              >
                                {customLoading
                                  ? "Applying…"
                                  : confirmCustomPlanActionLabel(
                                      customPreview.operation,
                                    )}
                              </button>
                              <button
                                type="button"
                                className="kxd-commercial-admin__text-btn"
                                onClick={resetCustomPlan}
                                disabled={customLoading}
                              >
                                Cancel review
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="kxd-commercial-admin__actions">
                            <button
                              type="button"
                              className="kxd-commercial-admin__text-btn"
                              onClick={resetCustomPlan}
                              disabled={customLoading}
                            >
                              Close review
                            </button>
                            {customError?.includes("out of date") ||
                            customError?.includes("Refresh") ||
                            customSelectionNeedsRefresh ? (
                              <button
                                type="button"
                                className="kxd-commercial-admin__secondary"
                                onClick={() =>
                                  void reviewCustomPlan(customSelectedModules)
                                }
                                disabled={customLoading}
                              >
                                Refresh preview
                              </button>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : customLoading ? (
                      <p className="kxd-commercial-admin__muted">
                        Generating custom-plan preview…
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
