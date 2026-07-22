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
  billingConfigurationOperationLabel,
  billingReadinessStatusLabel,
  commercialAddOnLabel,
  commercialProvisioningLabel,
  commercialRecordStatusLabel,
  confirmCustomPlanActionLabel,
  confirmPlanChangeActionLabel,
  customPlanEligibilityLabel,
  getCommercialAgreement,
  hasAgreementPlanMismatch,
  isBillingReviewAvailable,
  isCustomPlanCandidate,
  isLegacyConversionCandidate,
  listCommercialAgreements,
  BILLING_COLLECTION_METHODS,
  BILLING_CURRENCY_CODES,
  BILLING_INVOICE_CADENCES,
  BILLING_PAYMENT_TERMS,
  BILLING_TAX_POSTURES,
  type ActivationPreview,
  type ActivationResult,
  type BillingConfigurationEditableInput,
  type BillingConfigurationPreview,
  type BillingConfigurationResult,
  type BillingReadinessSnapshot,
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
import {
  stripeIntegrationStatusLabel,
  type StripeIntegrationReadiness,
} from "@/lib/stripe/integration-readiness-types";
import {
  stripeReconciliationStatusLabel,
  type StripeConnectivityResult,
  type StripeCustomerLinkPreview,
  type StripeCustomerLinkResult,
  type StripeCustomerReconciliationSnapshot,
  type StripeCustomerSearchResult,
} from "@/lib/stripe/customer-linking-types";
import {
  STRIPE_CUSTOMER_CREATE_NOTICES,
  type StripeCustomerCreatePreview,
  type StripeCustomerCreateResult,
} from "@/lib/stripe/customer-creation-types";
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

type BillingReadinessResponse = {
  ok?: boolean;
  message?: string;
  snapshot?: BillingReadinessSnapshot;
  notice?: string;
};

type BillingConfigurationPreviewResponse = {
  ok?: boolean;
  message?: string;
  code?: string;
  preview?: BillingConfigurationPreview;
  notice?: string;
};

type BillingConfigurationMutationResponse = {
  ok?: boolean;
  message?: string;
  code?: string;
  result?: BillingConfigurationResult;
};

type StripeIntegrationReadinessResponse = {
  ok?: boolean;
  message?: string;
  readiness?: StripeIntegrationReadiness;
  notice?: string;
};

type StripeEligibleClientRow = {
  clientId: number;
  clientName: string;
  billingProfileId: number | null;
  eligible: boolean;
  reason: string;
  mappingStatus: string | null;
  stripeCustomerId: string | null;
};

type StripeEligibleClientsResponse = {
  ok?: boolean;
  message?: string;
  clients?: StripeEligibleClientRow[];
  notice?: string;
};

type StripeConnectivityVerifyResponse = {
  ok?: boolean;
  message?: string;
  connectivity?: StripeConnectivityResult;
  notice?: string;
};

type StripeCustomerSearchResponse = {
  ok?: boolean;
  message?: string;
  search?: StripeCustomerSearchResult;
  notice?: string;
};

type StripeCustomerLinkPreviewResponse = {
  ok?: boolean;
  message?: string;
  preview?: StripeCustomerLinkPreview;
  notice?: string;
};

type StripeCustomerLinkMutationResponse = {
  ok?: boolean;
  message?: string;
  result?: StripeCustomerLinkResult;
  notice?: string;
};

type StripeCustomerUnlinkPreviewResponse = {
  ok?: boolean;
  message?: string;
  preview?: {
    clientId: number;
    billingProfileId: number;
    stripeCustomerId: string | null;
    previewFingerprint: string;
    canUnlink: boolean;
    message: string;
  };
};

type StripeCustomerUnlinkMutationResponse = {
  ok?: boolean;
  message?: string;
  result?: {
    outcome: string;
    clientId: number;
    billingProfileId: number;
    message: string;
    activityEmitted: boolean;
  };
};

type StripeCustomerReconcileResponse = {
  ok?: boolean;
  message?: string;
  reconciliation?: StripeCustomerReconciliationSnapshot;
  notice?: string;
};

type StripeCustomerCreatePreviewResponse = {
  ok?: boolean;
  message?: string;
  preview?: StripeCustomerCreatePreview;
  notice?: string;
};

type StripeCustomerCreateMutationResponse = {
  ok?: boolean;
  message?: string;
  result?: StripeCustomerCreateResult;
  notice?: string;
};

type EditorMode = "idle" | "edit" | "create";
type ActivationPhase = "closed" | "preview" | "result";
type PlanChangePhase = "closed" | "preview" | "result";
type LegacyConversionPhase = "closed" | "preview" | "result";
type CustomPlanPhase = "closed" | "preview" | "result";
type BillingReadinessPhase = "closed" | "review";
type BillingConfigPhase = "closed" | "form" | "preview" | "result";
type StripeReadinessPhase = "closed" | "review";
type StripeLinkingPhase = "closed" | "review";

function stripeConnectivityOutcomeLabel(
  outcome: StripeConnectivityResult["outcome"],
): string {
  switch (outcome) {
    case "authenticated_test_account":
      return "Connectivity verified";
    case "structurally_blocked":
      return "Structurally blocked";
    case "authentication_failed":
      return "Authentication failed";
    case "account_mismatch":
      return "Account mismatch";
    case "unavailable":
      return "Unavailable";
    case "live_mode_rejected":
      return "Live mode rejected";
    case "not_attempted":
      return "Not attempted";
    default:
      return outcome;
  }
}

type BillingConfigDraft = {
  currencyCode: string;
  billingContact: string;
  billingEmail: string;
  collectionMethod: string;
  paymentTerms: string;
  taxPosture: string;
  invoiceCadence: string;
};

function emptyBillingConfigDraft(): BillingConfigDraft {
  return {
    currencyCode: "",
    billingContact: "",
    billingEmail: "",
    collectionMethod: "",
    paymentTerms: "",
    taxPosture: "",
    invoiceCadence: "",
  };
}

function draftFromBillingSnapshot(
  snapshot: BillingReadinessSnapshot | null,
): BillingConfigDraft {
  if (!snapshot) return emptyBillingConfigDraft();
  return {
    currencyCode: snapshot.currency.code ?? "",
    billingContact: snapshot.billingContact.contactName ?? "",
    billingEmail: snapshot.billingContact.email ?? "",
    collectionMethod: snapshot.collectionMethod.method ?? "",
    paymentTerms: snapshot.paymentTermsConfigured ?? "",
    taxPosture: snapshot.taxPosture.posture ?? "",
    invoiceCadence: snapshot.cadence.profileInvoiceCadence ?? "",
  };
}

function draftToBillingConfigurationInput(
  draft: BillingConfigDraft,
): BillingConfigurationEditableInput {
  const collectionMethod =
    draft.collectionMethod === "send_invoice" ||
    draft.collectionMethod === "charge_automatically"
      ? draft.collectionMethod
      : null;
  return {
    currencyCode: draft.currencyCode === "usd" ? "usd" : null,
    billingContact: draft.billingContact.trim() || null,
    billingEmail: draft.billingEmail.trim() || null,
    collectionMethod,
    paymentTerms:
      collectionMethod === "charge_automatically"
        ? null
        : draft.paymentTerms === "due-on-receipt" ||
            draft.paymentTerms === "net-15" ||
            draft.paymentTerms === "net-30" ||
            draft.paymentTerms === "net-45"
          ? draft.paymentTerms
          : null,
    taxPosture:
      draft.taxPosture === "not_configured" ||
      draft.taxPosture === "tax_exempt" ||
      draft.taxPosture === "taxable" ||
      draft.taxPosture === "requires_review"
        ? draft.taxPosture
        : null,
    invoiceCadence:
      draft.invoiceCadence === "monthly" ||
      draft.invoiceCadence === "quarterly" ||
      draft.invoiceCadence === "milestone" ||
      draft.invoiceCadence === "on-completion"
        ? draft.invoiceCadence
        : null,
  };
}

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

function fmtMoneyExact(value: number | null, presence?: string): string {
  if (presence === "null" || value == null) return "Unset (null)";
  if (presence === "zero") return "$0.00 (explicit zero)";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

  const [billingPhase, setBillingPhase] =
    useState<BillingReadinessPhase>("closed");
  const [billingSnapshot, setBillingSnapshot] =
    useState<BillingReadinessSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const [billingConfigPhase, setBillingConfigPhase] =
    useState<BillingConfigPhase>("closed");
  const [billingConfigDraft, setBillingConfigDraft] =
    useState<BillingConfigDraft>(emptyBillingConfigDraft);
  const [billingConfigPreview, setBillingConfigPreview] =
    useState<BillingConfigurationPreview | null>(null);
  const [billingConfigResult, setBillingConfigResult] =
    useState<BillingConfigurationResult | null>(null);
  const [billingConfigLoading, setBillingConfigLoading] = useState(false);
  const [billingConfigError, setBillingConfigError] = useState<string | null>(
    null,
  );
  const [billingConfigAcknowledged, setBillingConfigAcknowledged] =
    useState(false);
  const [billingConfigNoActivateAck, setBillingConfigNoActivateAck] =
    useState(false);

  const [stripeReadinessPhase, setStripeReadinessPhase] =
    useState<StripeReadinessPhase>("closed");
  const [stripeReadiness, setStripeReadiness] =
    useState<StripeIntegrationReadiness | null>(null);
  const [stripeReadinessLoading, setStripeReadinessLoading] = useState(false);
  const [stripeReadinessError, setStripeReadinessError] = useState<
    string | null
  >(null);

  const [stripeLinkingPhase, setStripeLinkingPhase] =
    useState<StripeLinkingPhase>("closed");
  const [stripeLinkingLoading, setStripeLinkingLoading] = useState(false);
  const [stripeLinkingError, setStripeLinkingError] = useState<string | null>(
    null,
  );
  const [connectivity, setConnectivity] =
    useState<StripeConnectivityResult | null>(null);
  const [eligibleClients, setEligibleClients] = useState<
    StripeEligibleClientRow[]
  >([]);
  const [linkClientId, setLinkClientId] = useState<number | "">("");
  const [exactCustomerId, setExactCustomerId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] =
    useState<StripeCustomerSearchResult | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [linkPreview, setLinkPreview] =
    useState<StripeCustomerLinkPreview | null>(null);
  const [linkResult, setLinkResult] =
    useState<StripeCustomerLinkResult | null>(null);
  const [reconciliation, setReconciliation] =
    useState<StripeCustomerReconciliationSnapshot | null>(null);
  const [ackMissingMetadata, setAckMissingMetadata] = useState(false);
  const [ackNoBillingActivate, setAckNoBillingActivate] = useState(false);
  const [linkConfirmed, setLinkConfirmed] = useState(false);
  const [unlinkPreviewFingerprint, setUnlinkPreviewFingerprint] = useState<
    string | null
  >(null);
  const [unlinkConfirmed, setUnlinkConfirmed] = useState(false);
  const [createPreview, setCreatePreview] =
    useState<StripeCustomerCreatePreview | null>(null);
  const [createResult, setCreateResult] =
    useState<StripeCustomerCreateResult | null>(null);
  const [busyCreatingPreview, setBusyCreatingPreview] = useState(false);
  const [busyCreating, setBusyCreating] = useState(false);
  const [ackInformationalDuplicates, setAckInformationalDuplicates] =
    useState(false);
  const [ackCreateNoActivate, setAckCreateNoActivate] = useState(false);
  const [createConfirmed, setCreateConfirmed] = useState(false);
  const [busyConnecting, setBusyConnecting] = useState(false);
  const [busySearching, setBusySearching] = useState(false);
  const [busyLinking, setBusyLinking] = useState(false);
  const [busyReconciling, setBusyReconciling] = useState(false);
  const [busyUnlinking, setBusyUnlinking] = useState(false);

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

  function resetBillingReadiness() {
    setBillingPhase("closed");
    setBillingSnapshot(null);
    setBillingLoading(false);
    setBillingError(null);
  }

  function resetBillingConfiguration() {
    setBillingConfigPhase("closed");
    setBillingConfigDraft(emptyBillingConfigDraft());
    setBillingConfigPreview(null);
    setBillingConfigResult(null);
    setBillingConfigLoading(false);
    setBillingConfigError(null);
    setBillingConfigAcknowledged(false);
    setBillingConfigNoActivateAck(false);
  }

  function resetStripeReadiness() {
    setStripeReadinessPhase("closed");
    setStripeReadiness(null);
    setStripeReadinessLoading(false);
    setStripeReadinessError(null);
  }

  function resetStripeLinking() {
    setStripeLinkingPhase("closed");
    setStripeLinkingLoading(false);
    setStripeLinkingError(null);
    setConnectivity(null);
    setEligibleClients([]);
    setLinkClientId("");
    setExactCustomerId("");
    setSearchTerm("");
    setSearchResult(null);
    setSelectedCandidateId(null);
    setLinkPreview(null);
    setLinkResult(null);
    setReconciliation(null);
    setAckMissingMetadata(false);
    setAckNoBillingActivate(false);
    setLinkConfirmed(false);
    setUnlinkPreviewFingerprint(null);
    setUnlinkConfirmed(false);
    setCreatePreview(null);
    setCreateResult(null);
    setBusyCreatingPreview(false);
    setBusyCreating(false);
    setAckInformationalDuplicates(false);
    setAckCreateNoActivate(false);
    setCreateConfirmed(false);
    setBusyConnecting(false);
    setBusySearching(false);
    setBusyLinking(false);
    setBusyReconciling(false);
    setBusyUnlinking(false);
  }

  function resetReviews() {
    resetActivation();
    resetPlanChange();
    resetLegacyConversion();
    resetCustomPlan();
    resetBillingReadiness();
    resetBillingConfiguration();
    resetStripeReadiness();
    resetStripeLinking();
  }

  const anyReviewLoading =
    activationLoading ||
    planChangeLoading ||
    legacyLoading ||
    customLoading ||
    billingLoading ||
    billingConfigLoading ||
    stripeReadinessLoading ||
    stripeLinkingLoading ||
    busyCreatingPreview ||
    busyCreating;

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
    resetBillingReadiness();
    resetBillingConfiguration();
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
    resetBillingReadiness();
    resetBillingConfiguration();
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
    resetBillingReadiness();
    resetBillingConfiguration();
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
    resetBillingReadiness();
    resetBillingConfiguration();
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

  async function reviewBillingReadiness() {
    if (!selectedId || anyReviewLoading) {
      return;
    }
    resetActivation();
    resetPlanChange();
    resetLegacyConversion();
    resetCustomPlan();
    resetBillingConfiguration();
    setBillingLoading(true);
    setBillingError(null);
    setBillingSnapshot(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/billing-readiness`,
        {
          method: "GET",
          credentials: "same-origin",
        },
      );
      const json = (await res.json()) as BillingReadinessResponse;
      if (!res.ok || !json.ok || !json.snapshot) {
        throw new Error(
          json.message || "Unable to assess billing readiness.",
        );
      }
      setBillingSnapshot(json.snapshot);
      setBillingPhase("review");
    } catch (err) {
      setBillingError(
        err instanceof Error ? err.message : "Unable to assess billing readiness.",
      );
      setBillingPhase("review");
    } finally {
      setBillingLoading(false);
    }
  }

  function openBillingConfiguration(fromSnapshot: BillingReadinessSnapshot | null) {
    if (!selectedId || anyReviewLoading) return;
    resetActivation();
    resetPlanChange();
    resetLegacyConversion();
    resetCustomPlan();
    setBillingConfigDraft(draftFromBillingSnapshot(fromSnapshot));
    setBillingConfigPreview(null);
    setBillingConfigResult(null);
    setBillingConfigError(null);
    setBillingConfigAcknowledged(false);
    setBillingConfigNoActivateAck(false);
    setBillingConfigPhase("form");
  }

  async function previewBillingConfiguration() {
    if (!selectedId || billingConfigLoading) return;
    setBillingConfigLoading(true);
    setBillingConfigError(null);
    setBillingConfigPreview(null);
    setBillingConfigAcknowledged(false);
    setBillingConfigNoActivateAck(false);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/billing-configuration-preview`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftToBillingConfigurationInput(billingConfigDraft)),
        },
      );
      const json = (await res.json()) as BillingConfigurationPreviewResponse;
      if (!res.ok || !json.ok || !json.preview) {
        throw new Error(
          json.message || "Unable to generate billing-configuration preview.",
        );
      }
      setBillingConfigPreview(json.preview);
      setBillingConfigPhase("preview");
    } catch (err) {
      setBillingConfigError(
        err instanceof Error
          ? err.message
          : "Unable to generate billing-configuration preview.",
      );
      setBillingConfigPhase("preview");
    } finally {
      setBillingConfigLoading(false);
    }
  }

  async function confirmBillingConfiguration() {
    if (
      !selectedId ||
      !billingConfigPreview ||
      !billingConfigAcknowledged ||
      !billingConfigNoActivateAck ||
      billingConfigLoading
    ) {
      return;
    }
    setBillingConfigLoading(true);
    setBillingConfigError(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/${selectedId}/apply-billing-configuration`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draftToBillingConfigurationInput(billingConfigDraft),
            previewFingerprint: billingConfigPreview.previewFingerprint,
            confirmed: true,
            configurationDoesNotActivateBilling: true,
          }),
        },
      );
      const json = (await res.json()) as BillingConfigurationMutationResponse;
      if (!res.ok || !json.ok || !json.result) {
        if (res.status === 409 || json.code === "stale_preview") {
          throw new Error(
            json.message ||
              "This preview is out of date. Review a fresh preview and try again.",
          );
        }
        throw new Error(
          json.message || "Unable to save billing configuration.",
        );
      }
      setBillingConfigResult(json.result);
      setBillingConfigPhase("result");
      if (json.result.readiness) {
        setBillingSnapshot(json.result.readiness);
        setBillingPhase("review");
      }
      await load();
      if (selectedId) {
        const detailRes = await fetch(
          `/api/admin/commercial-agreements/${selectedId}`,
          { credentials: "same-origin" },
        );
        const detailJson = (await detailRes.json()) as DetailResponse;
        if (detailRes.ok && detailJson.ok && detailJson.agreement) {
          setDetail(detailJson.agreement);
        }
      }
    } catch (err) {
      setBillingConfigError(
        err instanceof Error
          ? err.message
          : "Unable to save billing configuration.",
      );
    } finally {
      setBillingConfigLoading(false);
    }
  }

  async function reviewStripeIntegrationReadiness() {
    if (anyReviewLoading) return;
    resetActivation();
    resetPlanChange();
    resetLegacyConversion();
    resetCustomPlan();
    resetBillingReadiness();
    resetBillingConfiguration();
    resetStripeLinking();
    setStripeReadinessLoading(true);
    setStripeReadinessError(null);
    setStripeReadiness(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-integration-readiness`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      const json = (await res.json()) as StripeIntegrationReadinessResponse;
      if (!res.ok || !json.ok || !json.readiness) {
        throw new Error(
          json.message || "Unable to assess Stripe integration readiness.",
        );
      }
      setStripeReadiness(json.readiness);
      setStripeReadinessPhase("review");
    } catch (err) {
      setStripeReadinessError(
        err instanceof Error
          ? err.message
          : "Unable to assess Stripe integration readiness.",
      );
      setStripeReadinessPhase("review");
    } finally {
      setStripeReadinessLoading(false);
    }
  }

  async function openStripeCustomerLinking() {
    if (anyReviewLoading) return;
    resetActivation();
    resetPlanChange();
    resetLegacyConversion();
    resetCustomPlan();
    resetBillingReadiness();
    resetBillingConfiguration();
    resetStripeReadiness();
    resetStripeLinking();
    setStripeLinkingPhase("review");
    setStripeLinkingLoading(true);
    setStripeLinkingError(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-customers/eligible`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      const json = (await res.json()) as StripeEligibleClientsResponse;
      if (!res.ok || !json.ok) {
        throw new Error(
          json.message || "Unable to load eligible billing clients.",
        );
      }
      setEligibleClients(json.clients ?? []);
    } catch (err) {
      setStripeLinkingError(
        err instanceof Error
          ? err.message
          : "Unable to load eligible billing clients.",
      );
    } finally {
      setStripeLinkingLoading(false);
    }
  }

  async function verifyStripeConnectivity() {
    if (busyConnecting || stripeLinkingLoading) return;
    setBusyConnecting(true);
    setStripeLinkingError(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-connectivity/verify`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmedReadOnly: true }),
        },
      );
      const json = (await res.json()) as StripeConnectivityVerifyResponse;
      if (!json.connectivity) {
        throw new Error(
          json.message || "Unable to verify Stripe test-mode connectivity.",
        );
      }
      setConnectivity(json.connectivity);
    } catch (err) {
      setStripeLinkingError(
        err instanceof Error
          ? err.message
          : "Unable to verify Stripe test-mode connectivity.",
      );
    } finally {
      setBusyConnecting(false);
    }
  }

  async function loadUnlinkPreviewForClient(clientId: number) {
    setUnlinkPreviewFingerprint(null);
    setUnlinkConfirmed(false);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-customers/unlink`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, previewOnly: true }),
        },
      );
      const json = (await res.json()) as StripeCustomerUnlinkPreviewResponse;
      if (!res.ok || !json.ok || !json.preview) {
        throw new Error(json.message || "Unable to load unlink preview.");
      }
      setUnlinkPreviewFingerprint(
        json.preview.previewFingerprint || null,
      );
    } catch (err) {
      setStripeLinkingError(
        err instanceof Error ? err.message : "Unable to load unlink preview.",
      );
    }
  }

  async function onStripeLinkClientChange(nextValue: string) {
    const nextId = nextValue === "" ? "" : Number(nextValue);
    setLinkClientId(
      nextId === "" || !Number.isInteger(nextId) || nextId <= 0 ? "" : nextId,
    );
    setExactCustomerId("");
    setSearchTerm("");
    setSearchResult(null);
    setSelectedCandidateId(null);
    setLinkPreview(null);
    setLinkResult(null);
    setReconciliation(null);
    setAckMissingMetadata(false);
    setAckNoBillingActivate(false);
    setLinkConfirmed(false);
    setUnlinkPreviewFingerprint(null);
    setUnlinkConfirmed(false);
    setCreatePreview(null);
    setCreateResult(null);
    setAckInformationalDuplicates(false);
    setAckCreateNoActivate(false);
    setCreateConfirmed(false);
    if (typeof nextId === "number" && Number.isInteger(nextId) && nextId > 0) {
      const row = eligibleClients.find((c) => c.clientId === nextId);
      if (row?.stripeCustomerId) {
        await loadUnlinkPreviewForClient(nextId);
      }
    }
  }

  async function searchStripeCustomersForLink() {
    if (
      busySearching ||
      linkClientId === "" ||
      (!exactCustomerId.trim() && !searchTerm.trim())
    ) {
      return;
    }
    setBusySearching(true);
    setStripeLinkingError(null);
    setSearchResult(null);
    setSelectedCandidateId(null);
    setLinkPreview(null);
    setLinkResult(null);
    setAckMissingMetadata(false);
    setAckNoBillingActivate(false);
    setLinkConfirmed(false);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-customers/search`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: linkClientId,
            exactCustomerId: exactCustomerId.trim() || undefined,
            searchTerm: searchTerm.trim() || undefined,
          }),
        },
      );
      const json = (await res.json()) as StripeCustomerSearchResponse;
      if (!res.ok || !json.ok || !json.search) {
        throw new Error(json.message || "Unable to search Stripe customers.");
      }
      setSearchResult(json.search);
    } catch (err) {
      setStripeLinkingError(
        err instanceof Error
          ? err.message
          : "Unable to search Stripe customers.",
      );
    } finally {
      setBusySearching(false);
    }
  }

  async function previewStripeCustomerLink() {
    if (
      busyLinking ||
      linkClientId === "" ||
      !selectedCandidateId
    ) {
      return;
    }
    setBusyLinking(true);
    setStripeLinkingError(null);
    setLinkPreview(null);
    setLinkResult(null);
    setLinkConfirmed(false);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-customers/link-preview`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: linkClientId,
            stripeCustomerId: selectedCandidateId,
            acknowledgeMissingMetadata: ackMissingMetadata,
          }),
        },
      );
      const json = (await res.json()) as StripeCustomerLinkPreviewResponse;
      if (!res.ok || !json.ok || !json.preview) {
        throw new Error(json.message || "Unable to preview customer link.");
      }
      setLinkPreview(json.preview);
    } catch (err) {
      setStripeLinkingError(
        err instanceof Error
          ? err.message
          : "Unable to preview customer link.",
      );
    } finally {
      setBusyLinking(false);
    }
  }

  async function confirmStripeCustomerLink() {
    if (
      busyLinking ||
      !linkPreview ||
      linkClientId === "" ||
      !linkConfirmed ||
      !ackNoBillingActivate
    ) {
      return;
    }
    if (linkPreview.requiresMissingMetadataAck && !ackMissingMetadata) {
      return;
    }
    const selected = eligibleClients.find((c) => c.clientId === linkClientId);
    if (!selected?.billingProfileId) {
      setStripeLinkingError(
        "Selected client has no billing profile available for linking.",
      );
      return;
    }
    setBusyLinking(true);
    setStripeLinkingError(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-customers/link`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: linkClientId,
            billingProfileId: selected.billingProfileId,
            stripeCustomerId: linkPreview.stripeCustomerId,
            previewFingerprint: linkPreview.previewFingerprint,
            confirmed: true,
            linkingDoesNotActivateBilling: true,
            acknowledgeMissingMetadata: ackMissingMetadata,
          }),
        },
      );
      const json = (await res.json()) as StripeCustomerLinkMutationResponse;
      if (!json.result) {
        throw new Error(json.message || "Unable to link Stripe customer.");
      }
      setLinkResult(json.result);
      if (json.result.outcome === "changed" || json.result.outcome === "unchanged") {
        setEligibleClients((prev) =>
          prev.map((row) =>
            row.clientId === linkClientId
              ? {
                  ...row,
                  mappingStatus: json.result!.mappingStatus,
                  stripeCustomerId: json.result!.stripeCustomerId,
                  reason: json.result!.stripeCustomerId
                    ? "Eligible · mapping present"
                    : row.reason,
                }
              : row,
          ),
        );
        if (json.result.stripeCustomerId) {
          await loadUnlinkPreviewForClient(linkClientId);
        }
      }
    } catch (err) {
      setStripeLinkingError(
        err instanceof Error
          ? err.message
          : "Unable to link Stripe customer.",
      );
    } finally {
      setBusyLinking(false);
    }
  }

  async function confirmStripeCustomerUnlink() {
    if (
      busyUnlinking ||
      linkClientId === "" ||
      !unlinkPreviewFingerprint ||
      !unlinkConfirmed
    ) {
      return;
    }
    const selected = eligibleClients.find((c) => c.clientId === linkClientId);
    if (!selected?.billingProfileId) {
      setStripeLinkingError(
        "Selected client has no billing profile available for unlinking.",
      );
      return;
    }
    setBusyUnlinking(true);
    setStripeLinkingError(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-customers/unlink`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: linkClientId,
            billingProfileId: selected.billingProfileId,
            previewFingerprint: unlinkPreviewFingerprint,
            confirmed: true,
            unlinkDoesNotAffectAccess: true,
          }),
        },
      );
      const json = (await res.json()) as StripeCustomerUnlinkMutationResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Unable to unlink Stripe customer.");
      }
      setEligibleClients((prev) =>
        prev.map((row) =>
          row.clientId === linkClientId
            ? {
                ...row,
                mappingStatus: "unlinked",
                stripeCustomerId: null,
                reason: "Eligible · unlinked",
              }
            : row,
        ),
      );
      setUnlinkPreviewFingerprint(null);
      setUnlinkConfirmed(false);
      setLinkResult(null);
      setLinkPreview(null);
      setReconciliation(null);
    } catch (err) {
      setStripeLinkingError(
        err instanceof Error
          ? err.message
          : "Unable to unlink Stripe customer.",
      );
    } finally {
      setBusyUnlinking(false);
    }
  }

  async function reconcileStripeCustomerMapping() {
    if (busyReconciling || linkClientId === "") return;
    setBusyReconciling(true);
    setStripeLinkingError(null);
    setReconciliation(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-customers/reconcile`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: linkClientId }),
        },
      );
      const json = (await res.json()) as StripeCustomerReconcileResponse;
      if (!res.ok || !json.ok || !json.reconciliation) {
        throw new Error(
          json.message || "Unable to reconcile Stripe customer mapping.",
        );
      }
      setReconciliation(json.reconciliation);
    } catch (err) {
      setStripeLinkingError(
        err instanceof Error
          ? err.message
          : "Unable to reconcile Stripe customer mapping.",
      );
    } finally {
      setBusyReconciling(false);
    }
  }

  async function previewStripeCustomerCreate() {
    if (
      busyCreatingPreview ||
      busyCreating ||
      linkClientId === ""
    ) {
      return;
    }
    const selected = eligibleClients.find((c) => c.clientId === linkClientId);
    if (!selected?.eligible || !selected.billingProfileId) {
      return;
    }
    setBusyCreatingPreview(true);
    setStripeLinkingError(null);
    setCreatePreview(null);
    setCreateResult(null);
    setCreateConfirmed(false);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-customers/create-preview`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: linkClientId,
            acknowledgeInformationalDuplicates: ackInformationalDuplicates,
          }),
        },
      );
      const json = (await res.json()) as StripeCustomerCreatePreviewResponse;
      if (!res.ok || !json.ok || !json.preview) {
        throw new Error(
          json.message || "Unable to preview Stripe customer creation.",
        );
      }
      setCreatePreview(json.preview);
    } catch (err) {
      setStripeLinkingError(
        err instanceof Error
          ? err.message
          : "Unable to preview Stripe customer creation.",
      );
    } finally {
      setBusyCreatingPreview(false);
    }
  }

  async function confirmStripeCustomerCreate() {
    if (
      busyCreating ||
      busyCreatingPreview ||
      !createPreview ||
      linkClientId === "" ||
      !createConfirmed ||
      !ackCreateNoActivate
    ) {
      return;
    }
    if (
      createPreview.requiresInformationalDuplicateAck &&
      !ackInformationalDuplicates
    ) {
      return;
    }
    if (!createPreview.canCreate) {
      return;
    }
    const selected = eligibleClients.find((c) => c.clientId === linkClientId);
    if (!selected?.eligible || !selected.billingProfileId) {
      setStripeLinkingError(
        "Selected client has no eligible billing profile for test customer creation.",
      );
      return;
    }
    setBusyCreating(true);
    setStripeLinkingError(null);
    try {
      const res = await fetch(
        `/api/admin/commercial-agreements/stripe-customers/create`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: linkClientId,
            billingProfileId: selected.billingProfileId,
            previewFingerprint: createPreview.previewFingerprint,
            confirmed: true,
            creatingTestCustomerDoesNotActivateBilling: true,
            acknowledgeInformationalDuplicates: ackInformationalDuplicates,
          }),
        },
      );
      const json = (await res.json()) as StripeCustomerCreateMutationResponse;
      if (!json.result) {
        throw new Error(
          json.message || "Unable to create Stripe test customer.",
        );
      }
      setCreateResult(json.result);
      if (
        json.result.outcome === "created" ||
        json.result.outcome === "recovered" ||
        json.result.outcome === "unchanged"
      ) {
        setEligibleClients((prev) =>
          prev.map((row) =>
            row.clientId === linkClientId
              ? {
                  ...row,
                  mappingStatus:
                    json.result!.mappingStatus ?? row.mappingStatus,
                  stripeCustomerId:
                    json.result!.stripeCustomerId ?? row.stripeCustomerId,
                  reason: json.result!.stripeCustomerId
                    ? "Eligible · mapping present"
                    : row.reason,
                }
              : row,
          ),
        );
        if (json.result.stripeCustomerId) {
          await loadUnlinkPreviewForClient(linkClientId);
        }
      }
    } catch (err) {
      setStripeLinkingError(
        err instanceof Error
          ? err.message
          : "Unable to create Stripe test customer.",
      );
    } finally {
      setBusyCreating(false);
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
  const showBillingReview =
    Boolean(detail) &&
    isBillingReviewAvailable({
      commercialAgreementId: detail!.commercialAgreementId,
    });
  const showBillingConfig = Boolean(detail) && mode === "idle";
  const selectedLinkClient =
    linkClientId === ""
      ? null
      : (eligibleClients.find((row) => row.clientId === linkClientId) ?? null);
  const selectedLinkIsMapped = Boolean(selectedLinkClient?.stripeCustomerId);

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
          <button
            type="button"
            className="kxd-commercial-admin__secondary"
            onClick={() => void reviewStripeIntegrationReadiness()}
            disabled={anyReviewLoading}
            aria-label="Review Stripe integration readiness"
          >
            {stripeReadinessLoading && stripeReadinessPhase === "closed"
              ? "Preparing…"
              : "Stripe integration readiness"}
          </button>
          <button
            type="button"
            className="kxd-commercial-admin__secondary"
            onClick={() => void openStripeCustomerLinking()}
            disabled={anyReviewLoading}
            aria-label="Open Stripe customer linking"
          >
            {stripeLinkingLoading && stripeLinkingPhase === "closed"
              ? "Preparing…"
              : "Stripe customer linking"}
          </button>
        </div>

        {stripeReadinessPhase !== "closed" ? (
          <div
            className="kxd-commercial-admin__activation kxd-commercial-admin__stripe-readiness"
            role="region"
            aria-label="Stripe integration readiness"
            aria-busy={stripeReadinessLoading}
          >
            <OpsSectionHead label="Stripe integration readiness" />
            <p className="kxd-commercial-admin__callout" role="note">
              Platform-level structural assessment only. Connectivity not tested.
              Execution disabled. No Stripe request performed. No financial objects
              created.
            </p>

            {stripeReadinessError ? (
              <p className="kxd-commercial-admin__error" role="alert">
                {stripeReadinessError}
              </p>
            ) : null}

            {stripeReadiness ? (
              <>
                <p
                  className={
                    stripeReadiness.status === "configured_test" ||
                    stripeReadiness.status === "configured_live"
                      ? "kxd-commercial-admin__status kxd-commercial-admin__status--active"
                      : stripeReadiness.status === "mode_mismatch" ||
                          stripeReadiness.status === "invalid_format"
                        ? "kxd-commercial-admin__status kxd-commercial-admin__status--blocked"
                        : "kxd-commercial-admin__status"
                  }
                  role="status"
                >
                  {stripeIntegrationStatusLabel(stripeReadiness.status)}
                  {" · "}
                  Execution disabled · Connectivity not tested
                </p>

                <dl className="kxd-commercial-admin__meta">
                  <div>
                    <dt>Secret key</dt>
                    <dd>
                      {stripeReadiness.secretKeyPresent ? "Present" : "Absent"}
                      {" · "}
                      Mode: {stripeReadiness.detectedSecretMode}
                    </dd>
                  </div>
                  <div>
                    <dt>Publishable key</dt>
                    <dd>
                      {stripeReadiness.publishableKeyPresent
                        ? "Present"
                        : "Absent"}
                      {" · "}
                      Mode: {stripeReadiness.detectedPublishableMode}
                    </dd>
                  </div>
                  <div>
                    <dt>Webhook secret</dt>
                    <dd>
                      {stripeReadiness.webhookSecretPresent
                        ? "Present"
                        : "Absent"}
                    </dd>
                  </div>
                  <div>
                    <dt>Mode alignment</dt>
                    <dd>
                      {stripeReadiness.modeAligned
                        ? "Aligned"
                        : "Mismatch"}
                    </dd>
                  </div>
                  <div>
                    <dt>Execution gate</dt>
                    <dd>Closed · Requires separately approved phase</dd>
                  </div>
                  <div>
                    <dt>Stripe objects created</dt>
                    <dd>None</dd>
                  </div>
                  <div>
                    <dt>Customer mapping strategy</dt>
                    <dd>Defined</dd>
                  </div>
                  <div>
                    <dt>Catalog strategy</dt>
                    <dd>Defined</dd>
                  </div>
                  <div>
                    <dt>Idempotency foundation</dt>
                    <dd>{stripeReadiness.idempotency.status}</dd>
                  </div>
                  <div>
                    <dt>Webhook foundation</dt>
                    <dd>{stripeReadiness.webhookArchitecture.status.replace(/_/g, " ")}</dd>
                  </div>
                  <div>
                    <dt>Reconciliation foundation</dt>
                    <dd>{stripeReadiness.reconciliation.status.replace(/_/g, " ")}</dd>
                  </div>
                </dl>

                {stripeReadiness.blockers.length > 0 ? (
                  <div className="kxd-commercial-admin__change-list">
                    <h3>Current blockers</h3>
                    <ul className="kxd-commercial-admin__blockers">
                      {stripeReadiness.blockers.map((row) => (
                        <li key={row.code}>{row.message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {stripeReadiness.prerequisites.length > 0 ? (
                  <div className="kxd-commercial-admin__change-list">
                    <h3>Review prerequisites</h3>
                    <ul>
                      {stripeReadiness.prerequisites.map((row) => (
                        <li key={row}>{row}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="kxd-commercial-admin__change-list">
                  <h3>Systems unchanged</h3>
                  <ul>
                    {stripeReadiness.systemsUnchanged.map((row) => (
                      <li key={row}>{row}</li>
                    ))}
                  </ul>
                </div>

                <p className="kxd-commercial-admin__muted">
                  Fingerprint {stripeReadiness.fingerprint}
                </p>

                <div className="kxd-commercial-admin__actions">
                  <button
                    type="button"
                    className="kxd-commercial-admin__text-btn"
                    onClick={resetStripeReadiness}
                    disabled={stripeReadinessLoading}
                  >
                    Close review
                  </button>
                </div>
              </>
            ) : stripeReadinessLoading ? (
              <p className="kxd-commercial-admin__muted" role="status">
                Assessing Stripe integration readiness…
              </p>
            ) : null}
          </div>
        ) : null}

        {stripeLinkingPhase !== "closed" ? (
          <div
            className="kxd-commercial-admin__activation kxd-commercial-admin__stripe-linking"
            role="region"
            aria-label="Stripe customer linking"
            aria-busy={
              stripeLinkingLoading ||
              busyConnecting ||
              busySearching ||
              busyLinking ||
              busyReconciling ||
              busyUnlinking ||
              busyCreatingPreview ||
              busyCreating
            }
          >
            <OpsSectionHead label="Stripe customer linking" />
            <p className="kxd-commercial-admin__callout" role="note">
              Test mode · Execution remains restricted · No customer created · No
              billing activated · Subscriptions and invoices remain unavailable
            </p>

            {stripeLinkingError ? (
              <p className="kxd-commercial-admin__error" role="alert">
                {stripeLinkingError}
              </p>
            ) : null}

            <div className="kxd-commercial-admin__change-list">
              <h3>Test-mode connectivity</h3>
              <p className="kxd-commercial-admin__muted">
                Deliberate operator action only. Performs one read-only Stripe
                request when structurally allowed. Never automatic.
              </p>
              <div className="kxd-commercial-admin__actions">
                <button
                  type="button"
                  className="kxd-commercial-admin__secondary"
                  onClick={() => void verifyStripeConnectivity()}
                  disabled={busyConnecting || stripeLinkingLoading}
                  aria-label="Verify test-mode connectivity"
                >
                  {busyConnecting
                    ? "Verifying…"
                    : "Verify test-mode connectivity"}
                </button>
              </div>
              {connectivity ? (
                <>
                  <p className="kxd-commercial-admin__status" role="status">
                    {stripeConnectivityOutcomeLabel(connectivity.outcome)}
                    {connectivity.accountId
                      ? ` · Account ${connectivity.accountId}`
                      : ""}
                    {connectivity.mode ? ` · Mode ${connectivity.mode}` : ""}
                    {" · "}
                    Stripe request{" "}
                    {connectivity.stripeRequestPerformed
                      ? "performed"
                      : "not performed"}
                    {" · Objects created none"}
                  </p>
                  <p className="kxd-commercial-admin__muted">
                    {connectivity.message}
                  </p>
                  {connectivity.blockers.length > 0 ? (
                    <ul className="kxd-commercial-admin__blockers">
                      {connectivity.blockers.map((row) => (
                        <li key={row.code}>{row.message}</li>
                      ))}
                    </ul>
                  ) : null}
                  {connectivity.notices.length > 0 ? (
                    <ul>
                      {connectivity.notices.map((row) => (
                        <li key={row}>{row}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="kxd-commercial-admin__change-list">
              <h3>Customer linking</h3>
              {stripeLinkingLoading ? (
                <p className="kxd-commercial-admin__muted" role="status">
                  Loading eligible billing clients…
                </p>
              ) : eligibleClients.length === 0 ? (
                <p className="kxd-commercial-admin__muted" role="status">
                  No billing profiles exist. Customer linking requires an
                  existing billing profile — profiles are not auto-created.
                  Linking is unavailable.
                </p>
              ) : (
                <>
                  <label className="kxd-commercial-admin__field">
                    <span>Client</span>
                    <select
                      value={linkClientId === "" ? "" : String(linkClientId)}
                      onChange={(e) =>
                        void onStripeLinkClientChange(e.target.value)
                      }
                      disabled={
                        busySearching ||
                        busyLinking ||
                        busyUnlinking ||
                        busyReconciling ||
                        busyCreatingPreview ||
                        busyCreating
                      }
                      aria-label="Select client for Stripe customer linking"
                    >
                      <option value="">Select a client…</option>
                      {eligibleClients.map((row) => (
                        <option key={row.clientId} value={row.clientId}>
                          {row.clientName}
                          {row.eligible ? "" : " (blocked)"}
                          {row.stripeCustomerId ? " · mapped" : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedLinkClient ? (
                    <p className="kxd-commercial-admin__muted">
                      {selectedLinkClient.reason}
                      {" · "}
                      Mapping{" "}
                      {selectedLinkClient.mappingStatus || "unknown"}
                      {selectedLinkClient.stripeCustomerId
                        ? ` · ${selectedLinkClient.stripeCustomerId}`
                        : ""}
                      {!selectedLinkClient.eligible
                        ? " · Linking blocked for this client"
                        : ""}
                    </p>
                  ) : null}

                  {selectedLinkClient?.eligible ? (
                    <>
                      <label className="kxd-commercial-admin__field">
                        <span>Exact Stripe customer ID</span>
                        <input
                          type="text"
                          autoComplete="off"
                          value={exactCustomerId}
                          onChange={(e) => {
                            setExactCustomerId(e.target.value);
                            setLinkPreview(null);
                            setLinkResult(null);
                          }}
                          disabled={busySearching || busyLinking}
                          placeholder="cus_…"
                          aria-label="Exact Stripe customer ID"
                        />
                      </label>
                      <label className="kxd-commercial-admin__field">
                        <span>Search term (email or name)</span>
                        <input
                          type="text"
                          autoComplete="off"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setLinkPreview(null);
                            setLinkResult(null);
                          }}
                          disabled={busySearching || busyLinking}
                          aria-label="Stripe customer search term"
                        />
                      </label>
                      <div className="kxd-commercial-admin__actions">
                        <button
                          type="button"
                          className="kxd-commercial-admin__secondary"
                          onClick={() => void searchStripeCustomersForLink()}
                          disabled={
                            busySearching ||
                            busyLinking ||
                            (!exactCustomerId.trim() && !searchTerm.trim())
                          }
                          aria-label="Search Stripe customers"
                        >
                          {busySearching ? "Searching…" : "Search customers"}
                        </button>
                      </div>

                      {searchResult ? (
                        <div>
                          <p className="kxd-commercial-admin__muted">
                            Query {searchResult.queryKind}
                            {searchResult.stripeRequestPerformed
                              ? " · Stripe request performed"
                              : " · No Stripe request"}
                          </p>
                          {searchResult.notices.length > 0 ? (
                            <ul>
                              {searchResult.notices.map((row) => (
                                <li key={row}>{row}</li>
                              ))}
                            </ul>
                          ) : null}
                          {searchResult.blockers.length > 0 ? (
                            <ul className="kxd-commercial-admin__blockers">
                              {searchResult.blockers.map((row) => (
                                <li key={`${row.code}-${row.message}`}>
                                  {row.message}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {searchResult.candidates.length === 0 ? (
                            <p className="kxd-commercial-admin__muted">
                              No candidates returned.
                            </p>
                          ) : (
                            <ul
                              className="kxd-commercial-admin__list"
                              role="radiogroup"
                              aria-label="Stripe customer candidates"
                            >
                              {searchResult.candidates.map((candidate) => (
                                <li key={candidate.stripeCustomerId}>
                                  <label className="kxd-commercial-admin__ack">
                                    <input
                                      type="radio"
                                      name="stripe-customer-candidate"
                                      checked={
                                        selectedCandidateId ===
                                        candidate.stripeCustomerId
                                      }
                                      onChange={() => {
                                        setSelectedCandidateId(
                                          candidate.stripeCustomerId,
                                        );
                                        setLinkPreview(null);
                                        setLinkResult(null);
                                        setAckMissingMetadata(false);
                                        setAckNoBillingActivate(false);
                                        setLinkConfirmed(false);
                                      }}
                                      disabled={busyLinking}
                                    />
                                    <span>
                                      {candidate.displayName ||
                                        candidate.stripeCustomerId}
                                      {" · "}
                                      {candidate.billingEmailMasked ||
                                        "email hidden"}
                                      {" · "}
                                      {candidate.eligibleToLink
                                        ? "eligible"
                                        : "blocked"}
                                      {candidate.deleted ? " · deleted" : ""}
                                      {candidate.alreadyLinkedInternally
                                        ? " · already linked internally"
                                        : ""}
                                    </span>
                                  </label>
                                  {candidate.blockers.length > 0 ? (
                                    <ul className="kxd-commercial-admin__blockers">
                                      {candidate.blockers.map((row) => (
                                        <li
                                          key={`${candidate.stripeCustomerId}-${row.code}`}
                                        >
                                          {row.message}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                  {candidate.emailNameNotes.length > 0 ? (
                                    <p className="kxd-commercial-admin__muted">
                                      {candidate.emailNameNotes.join(" · ")}
                                    </p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}

                      {selectedCandidateId ? (
                        <div className="kxd-commercial-admin__actions">
                          <button
                            type="button"
                            className="kxd-commercial-admin__secondary"
                            onClick={() => void previewStripeCustomerLink()}
                            disabled={busyLinking}
                            aria-label="Preview Stripe customer link"
                          >
                            {busyLinking && !linkPreview
                              ? "Preparing preview…"
                              : "Preview link"}
                          </button>
                        </div>
                      ) : null}

                      {linkPreview ? (
                        <>
                          <p className="kxd-commercial-admin__status" role="status">
                            {linkPreview.canLink
                              ? "Link preview ready"
                              : "Link preview blocked"}
                            {" · "}
                            Customer {linkPreview.stripeCustomerId}
                            {" · Account "}
                            {linkPreview.accountId}
                            {" · Mode "}
                            {linkPreview.mode}
                          </p>
                          {linkPreview.warnings.length > 0 ? (
                            <ul>
                              {linkPreview.warnings.map((row) => (
                                <li key={row}>{row}</li>
                              ))}
                            </ul>
                          ) : null}
                          {linkPreview.blockers.length > 0 ? (
                            <ul className="kxd-commercial-admin__blockers">
                              {linkPreview.blockers.map((row) => (
                                <li key={`${row.code}-${row.message}`}>
                                  {row.message}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {linkPreview.notices.length > 0 ? (
                            <ul>
                              {linkPreview.notices.map((row) => (
                                <li key={row}>{row}</li>
                              ))}
                            </ul>
                          ) : null}
                          <p className="kxd-commercial-admin__muted">
                            Fingerprint {linkPreview.previewFingerprint}
                          </p>

                          {linkPreview.requiresMissingMetadataAck ? (
                            <label className="kxd-commercial-admin__ack">
                              <input
                                type="checkbox"
                                checked={ackMissingMetadata}
                                onChange={(e) => {
                                  const next = e.target.checked;
                                  setAckMissingMetadata(next);
                                  setLinkConfirmed(false);
                                  // Re-preview with acknowledgment so canLink can clear.
                                  if (selectedCandidateId && linkClientId !== "") {
                                    void (async () => {
                                      setBusyLinking(true);
                                      setStripeLinkingError(null);
                                      try {
                                        const res = await fetch(
                                          `/api/admin/commercial-agreements/stripe-customers/link-preview`,
                                          {
                                            method: "POST",
                                            credentials: "same-origin",
                                            headers: {
                                              "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({
                                              clientId: linkClientId,
                                              stripeCustomerId:
                                                selectedCandidateId,
                                              acknowledgeMissingMetadata: next,
                                            }),
                                          },
                                        );
                                        const json =
                                          (await res.json()) as StripeCustomerLinkPreviewResponse;
                                        if (
                                          !res.ok ||
                                          !json.ok ||
                                          !json.preview
                                        ) {
                                          throw new Error(
                                            json.message ||
                                              "Unable to preview customer link.",
                                          );
                                        }
                                        setLinkPreview(json.preview);
                                      } catch (err) {
                                        setStripeLinkingError(
                                          err instanceof Error
                                            ? err.message
                                            : "Unable to preview customer link.",
                                        );
                                      } finally {
                                        setBusyLinking(false);
                                      }
                                    })();
                                  }
                                }}
                                disabled={busyLinking}
                              />
                              <span>
                                I acknowledge Stripe customer metadata is
                                missing or incomplete for this link.
                              </span>
                            </label>
                          ) : null}

                          <label className="kxd-commercial-admin__ack">
                            <input
                              type="checkbox"
                              checked={ackNoBillingActivate}
                              onChange={(e) =>
                                setAckNoBillingActivate(e.target.checked)
                              }
                              disabled={busyLinking}
                            />
                            <span>
                              Linking does not activate billing,
                              subscriptions, or invoices.
                            </span>
                          </label>
                          <label className="kxd-commercial-admin__ack">
                            <input
                              type="checkbox"
                              checked={linkConfirmed}
                              onChange={(e) =>
                                setLinkConfirmed(e.target.checked)
                              }
                              disabled={busyLinking}
                            />
                            <span>
                              I confirm this internal mapping after reviewing
                              the preview.
                            </span>
                          </label>

                          <div className="kxd-commercial-admin__actions">
                            <button
                              type="button"
                              className="kxd-commercial-admin__secondary"
                              onClick={() => void confirmStripeCustomerLink()}
                              disabled={
                                busyLinking ||
                                !linkPreview.canLink ||
                                !ackNoBillingActivate ||
                                !linkConfirmed ||
                                (linkPreview.requiresMissingMetadataAck &&
                                  !ackMissingMetadata)
                              }
                              aria-label="Confirm Stripe customer link"
                            >
                              {busyLinking ? "Linking…" : "Confirm link"}
                            </button>
                          </div>
                        </>
                      ) : null}

                      {linkResult ? (
                        <p className="kxd-commercial-admin__status" role="status">
                          {linkResult.outcome.replace(/_/g, " ")}
                          {" · "}
                          {linkResult.message}
                          {" · "}
                          {stripeReconciliationStatusLabel(
                            linkResult.reconciliationStatus,
                          )}
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {selectedLinkIsMapped ? (
                    <div className="kxd-commercial-admin__change-list">
                      <h3>Unlink mapping</h3>
                      <p className="kxd-commercial-admin__muted">
                        Removes the internal mapping only. Stripe customer is
                        not deleted or modified. Access is unchanged.
                      </p>
                      {unlinkPreviewFingerprint ? (
                        <p className="kxd-commercial-admin__muted">
                          Unlink fingerprint {unlinkPreviewFingerprint}
                        </p>
                      ) : (
                        <p className="kxd-commercial-admin__muted">
                          Unlink preview not loaded.
                        </p>
                      )}
                      <label className="kxd-commercial-admin__ack">
                        <input
                          type="checkbox"
                          checked={unlinkConfirmed}
                          onChange={(e) =>
                            setUnlinkConfirmed(e.target.checked)
                          }
                          disabled={busyUnlinking || !unlinkPreviewFingerprint}
                        />
                        <span>
                          I confirm unlink. Access and Stripe customer remain
                          unchanged.
                        </span>
                      </label>
                      <div className="kxd-commercial-admin__actions">
                        <button
                          type="button"
                          className="kxd-commercial-admin__secondary"
                          onClick={() => void confirmStripeCustomerUnlink()}
                          disabled={
                            busyUnlinking ||
                            !unlinkConfirmed ||
                            !unlinkPreviewFingerprint
                          }
                          aria-label="Confirm Stripe customer unlink"
                        >
                          {busyUnlinking ? "Unlinking…" : "Confirm unlink"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="kxd-commercial-admin__change-list">
              <h3>Create test customer</h3>
              <p className="kxd-commercial-admin__callout" role="note">
                Creates one Stripe test customer and links it internally. No
                subscription, invoice, payment, or access change. Live mode is
                disabled. Customer deletion is not available in this phase.
              </p>
              {STRIPE_CUSTOMER_CREATE_NOTICES.length > 0 ? (
                <ul>
                  {STRIPE_CUSTOMER_CREATE_NOTICES.map((row) => (
                    <li key={row}>{row}</li>
                  ))}
                </ul>
              ) : null}
              {eligibleClients.length === 0 || linkClientId === "" ? (
                <p className="kxd-commercial-admin__muted" role="status">
                  Test customer creation is unavailable until a billing profile
                  exists and a client is selected. Profiles are not
                  auto-created.
                </p>
              ) : !selectedLinkClient?.eligible ||
                !selectedLinkClient.billingProfileId ? (
                <p className="kxd-commercial-admin__muted" role="status">
                  Creation is unavailable for this selection. An eligible
                  billing profile is required.
                </p>
              ) : (
                <>
                  <div className="kxd-commercial-admin__actions">
                    <button
                      type="button"
                      className="kxd-commercial-admin__secondary"
                      onClick={() => void previewStripeCustomerCreate()}
                      disabled={busyCreatingPreview || busyCreating}
                      aria-label="Review Stripe test customer creation preview"
                    >
                      {busyCreatingPreview
                        ? "Preparing preview…"
                        : "Review creation preview"}
                    </button>
                  </div>

                  {createPreview ? (
                    <>
                      <p
                        className="kxd-commercial-admin__status"
                        role="status"
                      >
                        {createPreview.canCreate
                          ? "Creation preview ready"
                          : "Creation preview blocked"}
                        {" · "}
                        {createPreview.clientName}
                        {" · Account "}
                        {createPreview.accountId}
                        {" · Mode "}
                        {createPreview.mode}
                      </p>
                      <dl className="kxd-commercial-admin__meta">
                        <div>
                          <dt>Name</dt>
                          <dd>{createPreview.payload.name}</dd>
                        </div>
                        <div>
                          <dt>Email</dt>
                          <dd>{createPreview.payload.emailMasked}</dd>
                        </div>
                        <div>
                          <dt>Metadata keys</dt>
                          <dd>
                            {createPreview.payload.metadataKeys.join(", ") ||
                              "None"}
                          </dd>
                        </div>
                      </dl>
                      <p className="kxd-commercial-admin__muted">
                        Fingerprint {createPreview.previewFingerprint}
                      </p>
                      {createPreview.blockers.length > 0 ? (
                        <ul className="kxd-commercial-admin__blockers">
                          {createPreview.blockers.map((row) => (
                            <li key={`${row.code}-${row.message}`}>
                              {row.message}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {createPreview.warnings.length > 0 ? (
                        <ul>
                          {createPreview.warnings.map((row) => (
                            <li key={row}>{row}</li>
                          ))}
                        </ul>
                      ) : null}
                      {createPreview.informationalEmailNameMatches.length >
                      0 ? (
                        <div>
                          <p className="kxd-commercial-admin__muted">
                            Informational email/name matches (not blockers by
                            themselves):
                          </p>
                          <ul>
                            {createPreview.informationalEmailNameMatches.map(
                              (row) => (
                                <li key={row.stripeCustomerId}>
                                  {row.displayName || row.stripeCustomerId}
                                  {" · "}
                                  {row.billingEmailMasked || "email hidden"}
                                  {" · "}
                                  {row.note}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      ) : null}
                      {createPreview.existingMetadataMatches.length > 0 ? (
                        <ul className="kxd-commercial-admin__blockers">
                          {createPreview.existingMetadataMatches.map((row) => (
                            <li key={row.stripeCustomerId}>
                              {row.stripeCustomerId}
                              {" · "}
                              {row.note}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {createPreview.notices.length > 0 ? (
                        <ul>
                          {createPreview.notices.map((row) => (
                            <li key={row}>{row}</li>
                          ))}
                        </ul>
                      ) : null}

                      {createPreview.requiresInformationalDuplicateAck ? (
                        <label className="kxd-commercial-admin__ack">
                          <input
                            type="checkbox"
                            checked={ackInformationalDuplicates}
                            onChange={(e) => {
                              const next = e.target.checked;
                              setAckInformationalDuplicates(next);
                              setCreateConfirmed(false);
                              const clientId = linkClientId;
                              if (typeof clientId !== "number") {
                                return;
                              }
                              void (async () => {
                                  if (busyCreatingPreview || busyCreating) {
                                    return;
                                  }
                                  setBusyCreatingPreview(true);
                                  setStripeLinkingError(null);
                                  try {
                                    const res = await fetch(
                                      `/api/admin/commercial-agreements/stripe-customers/create-preview`,
                                      {
                                        method: "POST",
                                        credentials: "same-origin",
                                        cache: "no-store",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          clientId,
                                          acknowledgeInformationalDuplicates:
                                            next,
                                        }),
                                      },
                                    );
                                    const json =
                                      (await res.json()) as StripeCustomerCreatePreviewResponse;
                                    if (
                                      !res.ok ||
                                      !json.ok ||
                                      !json.preview
                                    ) {
                                      throw new Error(
                                        json.message ||
                                          "Unable to preview Stripe customer creation.",
                                      );
                                    }
                                    setCreatePreview(json.preview);
                                  } catch (err) {
                                    setStripeLinkingError(
                                      err instanceof Error
                                        ? err.message
                                        : "Unable to preview Stripe customer creation.",
                                    );
                                  } finally {
                                    setBusyCreatingPreview(false);
                                  }
                                })();
                            }}
                            disabled={busyCreatingPreview || busyCreating}
                          />
                          <span>
                            I acknowledge informational email/name matches and
                            still want to create a distinct test customer.
                          </span>
                        </label>
                      ) : null}

                      <label className="kxd-commercial-admin__ack">
                        <input
                          type="checkbox"
                          checked={ackCreateNoActivate}
                          onChange={(e) =>
                            setAckCreateNoActivate(e.target.checked)
                          }
                          disabled={busyCreatingPreview || busyCreating}
                        />
                        <span>
                          Creating a test customer does not activate billing,
                          subscriptions, invoices, or access.
                        </span>
                      </label>
                      <label className="kxd-commercial-admin__ack">
                        <input
                          type="checkbox"
                          checked={createConfirmed}
                          onChange={(e) =>
                            setCreateConfirmed(e.target.checked)
                          }
                          disabled={busyCreatingPreview || busyCreating}
                        />
                        <span>
                          I confirm creating one Stripe test customer and
                          linking it internally after reviewing the preview.
                        </span>
                      </label>

                      <div className="kxd-commercial-admin__actions">
                        <button
                          type="button"
                          className="kxd-commercial-admin__secondary"
                          onClick={() => void confirmStripeCustomerCreate()}
                          disabled={
                            busyCreating ||
                            busyCreatingPreview ||
                            !createPreview.canCreate ||
                            !ackCreateNoActivate ||
                            !createConfirmed ||
                            (createPreview.requiresInformationalDuplicateAck &&
                              !ackInformationalDuplicates)
                          }
                          aria-label="Confirm create Stripe test customer"
                        >
                          {busyCreating
                            ? "Creating…"
                            : "Confirm create test customer"}
                        </button>
                      </div>
                    </>
                  ) : null}

                  {createResult ? (
                    <p
                      className="kxd-commercial-admin__status"
                      role="status"
                    >
                      {createResult.outcome.replace(/_/g, " ")}
                      {" · "}
                      {createResult.message}
                      {createResult.stripeCustomerId
                        ? ` · ${createResult.stripeCustomerId}`
                        : ""}
                      {createResult.reconciliationStatus
                        ? ` · ${stripeReconciliationStatusLabel(createResult.reconciliationStatus)}`
                        : ""}
                      {createResult.stripeCustomerCreated
                        ? " · customer created"
                        : ""}
                      {createResult.activityEmitted
                        ? " · activity emitted"
                        : " · activity not emitted"}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div className="kxd-commercial-admin__change-list">
              <h3>Reconciliation</h3>
              <p className="kxd-commercial-admin__muted">
                Read-only comparison of internal mapping with external customer
                facts. No repair or Stripe mutation.
              </p>
              <div className="kxd-commercial-admin__actions">
                <button
                  type="button"
                  className="kxd-commercial-admin__secondary"
                  onClick={() => void reconcileStripeCustomerMapping()}
                  disabled={
                    busyReconciling ||
                    linkClientId === "" ||
                    stripeLinkingLoading
                  }
                  aria-label="Reconcile Stripe customer mapping"
                >
                  {busyReconciling
                    ? "Reconciling…"
                    : "Reconcile selected client"}
                </button>
              </div>
              {reconciliation ? (
                <>
                  <p className="kxd-commercial-admin__status" role="status">
                    {reconciliation.statusLabel ||
                      stripeReconciliationStatusLabel(reconciliation.status)}
                  </p>
                  <p className="kxd-commercial-admin__muted">
                    Recommended action: {reconciliation.recommendedAction}
                  </p>
                  {reconciliation.notices.length > 0 ? (
                    <ul>
                      {reconciliation.notices.map((row) => (
                        <li key={row}>{row}</li>
                      ))}
                    </ul>
                  ) : null}
                  {reconciliation.blockers.length > 0 ? (
                    <ul className="kxd-commercial-admin__blockers">
                      {reconciliation.blockers.map((row) => (
                        <li key={`${row.code}-${row.message}`}>
                          {row.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <dl className="kxd-commercial-admin__meta">
                    <div>
                      <dt>Customer</dt>
                      <dd>
                        {reconciliation.stripeCustomerId || "None"}
                        {reconciliation.accountId
                          ? ` · Account ${reconciliation.accountId}`
                          : ""}
                        {reconciliation.mode
                          ? ` · Mode ${reconciliation.mode}`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Stripe request</dt>
                      <dd>
                        {reconciliation.stripeRequestPerformed
                          ? "Performed"
                          : "Not performed"}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : null}
            </div>

            <div className="kxd-commercial-admin__actions">
              <button
                type="button"
                className="kxd-commercial-admin__text-btn"
                onClick={resetStripeLinking}
                disabled={
                  stripeLinkingLoading ||
                  busyConnecting ||
                  busySearching ||
                  busyLinking ||
                  busyReconciling ||
                  busyUnlinking ||
                  busyCreatingPreview ||
                  busyCreating
                }
              >
                Close review
              </button>
            </div>
          </div>
        ) : null}

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
                  {showBillingReview ? (
                    <button
                      type="button"
                      className="kxd-commercial-admin__secondary"
                      onClick={() => void reviewBillingReadiness()}
                      disabled={anyReviewLoading}
                      aria-label="Review billing readiness"
                    >
                      {billingLoading && billingPhase === "closed"
                        ? "Preparing…"
                        : "Review billing readiness"}
                    </button>
                  ) : null}
                  {showBillingConfig ? (
                    <button
                      type="button"
                      className="kxd-commercial-admin__secondary"
                      onClick={() =>
                        openBillingConfiguration(
                          billingPhase === "review" ? billingSnapshot : null,
                        )
                      }
                      disabled={anyReviewLoading}
                      aria-label="Configure billing details"
                    >
                      {billingConfigLoading && billingConfigPhase === "closed"
                        ? "Preparing…"
                        : "Configure billing details"}
                    </button>
                  ) : null}
                  {showBillingReview || showBillingConfig ? (
                    <p className="kxd-commercial-admin__muted">
                      Billing review and configuration are internal only · No
                      billing action performed from this workspace
                    </p>
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

                {billingPhase !== "closed" ? (
                  <div
                    className="kxd-commercial-admin__activation kxd-commercial-admin__billing"
                    role="region"
                    aria-label="Billing readiness review"
                    aria-busy={billingLoading}
                  >
                    <OpsSectionHead label="Billing readiness" />
                    <p className="kxd-commercial-admin__callout" role="note">
                      Internal readiness assessment only. No charge, Stripe object,
                      subscription, invoice, or payment is created from this review.
                    </p>

                    {billingError ? (
                      <p className="kxd-commercial-admin__error" role="alert">
                        {billingError}
                      </p>
                    ) : null}

                    {billingSnapshot ? (
                      <>
                        <p
                          className={
                            billingSnapshot.readiness === "blocked" ||
                            billingSnapshot.readiness === "state_mismatch"
                              ? "kxd-commercial-admin__status kxd-commercial-admin__status--blocked"
                              : billingSnapshot.readiness ===
                                    "ready_for_review" ||
                                  billingSnapshot.readiness ===
                                    "ready_for_future_sync"
                                ? "kxd-commercial-admin__status kxd-commercial-admin__status--active"
                                : "kxd-commercial-admin__status"
                          }
                          role="status"
                        >
                          {billingReadinessStatusLabel(billingSnapshot.readiness)}
                          {" · "}
                          {billingSnapshot.readinessExplanation}
                        </p>

                        <dl className="kxd-commercial-admin__meta">
                          <div>
                            <dt>Client</dt>
                            <dd>
                              {billingSnapshot.clientName} (#{billingSnapshot.clientId})
                            </dd>
                          </div>
                          <div>
                            <dt>Agreement</dt>
                            <dd>
                              {billingSnapshot.agreementName ?? "—"}
                              {billingSnapshot.agreementId
                                ? ` · ${billingSnapshot.agreementId}`
                                : ""}
                            </dd>
                          </div>
                          <div>
                            <dt>Plan and access</dt>
                            <dd>
                              {billingSnapshot.planKey ?? "null"} ·{" "}
                              {billingSnapshot.planStatus ?? "null"} ·{" "}
                              {billingSnapshot.assignmentClassification}
                            </dd>
                          </div>
                          <div>
                            <dt>Commercial-to-plan alignment</dt>
                            <dd>{billingSnapshot.alignment.explanation}</dd>
                          </div>
                          <div>
                            <dt>One-time amount (setup fee)</dt>
                            <dd>
                              {fmtMoneyExact(
                                billingSnapshot.setupFee.amount,
                                billingSnapshot.setupFee.presence,
                              )}{" "}
                              · {billingSnapshot.setupFee.classification} ·{" "}
                              {billingSnapshot.setupFee.kind}
                            </dd>
                          </div>
                          <div>
                            <dt>Monthly amount (retainer)</dt>
                            <dd>
                              {fmtMoneyExact(
                                billingSnapshot.monthlyRetainer.amount,
                                billingSnapshot.monthlyRetainer.presence,
                              )}{" "}
                              · {billingSnapshot.monthlyRetainer.classification} ·{" "}
                              {billingSnapshot.monthlyRetainer.kind}
                            </dd>
                          </div>
                          <div>
                            <dt>Monthly service credits</dt>
                            <dd>
                              {billingSnapshot.monthlyServiceCredits.presence ===
                              "null"
                                ? "Unset (null)"
                                : String(
                                    billingSnapshot.monthlyServiceCredits.amount,
                                  )}{" "}
                              · capacity only (not cash)
                            </dd>
                          </div>
                          <div>
                            <dt>Currency</dt>
                            <dd>
                              {billingSnapshot.currency.authoritative
                                ? billingSnapshot.currency.code
                                : "Not authoritative"}{" "}
                              · documented unit:{" "}
                              {billingSnapshot.currency.documentedFieldUnit ?? "—"}
                            </dd>
                          </div>
                          <div>
                            <dt>Collection method</dt>
                            <dd>
                              {billingSnapshot.collectionMethod.method ??
                                "Not configured"}
                              {billingSnapshot.collectionMethod
                                .automaticCollectionAllowed
                                ? " · automatic collection intended (not enabled)"
                                : ""}
                            </dd>
                          </div>
                          <div>
                            <dt>Payment terms</dt>
                            <dd>
                              {billingSnapshot.paymentTermsConfigured ?? "—"}
                            </dd>
                          </div>
                          <div>
                            <dt>Tax posture</dt>
                            <dd>
                              {billingSnapshot.taxPosture.posture ??
                                "Not recorded"}
                            </dd>
                          </div>
                          <div>
                            <dt>Billing cadence</dt>
                            <dd>
                              Retainer:{" "}
                              {billingSnapshot.cadence.retainerCadence ?? "—"}
                              {" · "}
                              Profile preference:{" "}
                              {billingSnapshot.cadence.profileInvoiceCadence ??
                                "—"}
                            </dd>
                          </div>
                          <div>
                            <dt>Billing contact</dt>
                            <dd>
                              {billingSnapshot.billingContact.present
                                ? [
                                    billingSnapshot.billingContact.contactName,
                                    billingSnapshot.billingContact.email,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")
                                : "Missing"}
                            </dd>
                          </div>
                        </dl>

                        {billingSnapshot.commercialAddOns.length > 0 ? (
                          <div className="kxd-commercial-admin__change-list">
                            <h3>Commercial add-ons</h3>
                            <ul>
                              {billingSnapshot.commercialAddOns.map((row) => (
                                <li key={row.id}>
                                  {row.label} · {row.classification}
                                  {row.pricingNote ? ` · ${row.pricingNote}` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="kxd-commercial-admin__muted">
                            No commercial add-ons recorded.
                          </p>
                        )}

                        {billingSnapshot.missingRequired.length > 0 ? (
                          <div className="kxd-commercial-admin__change-list">
                            <h3>Missing billing information</h3>
                            <ul>
                              {billingSnapshot.missingRequired.map((row) => (
                                <li key={row}>{row}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {billingSnapshot.blockers.length > 0 ? (
                          <ul className="kxd-commercial-admin__blockers">
                            {billingSnapshot.blockers.map((row) => (
                              <li key={row.code}>{row.message}</li>
                            ))}
                          </ul>
                        ) : null}

                        {billingSnapshot.warnings.length > 0 ? (
                          <ul className="kxd-commercial-admin__warnings">
                            {billingSnapshot.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        ) : null}

                        {billingSnapshot.externalIdentities.length > 0 ? (
                          <div className="kxd-commercial-admin__change-list">
                            <h3>External identities (sanitized)</h3>
                            <ul>
                              {billingSnapshot.externalIdentities.map((row) => (
                                <li key={`${row.provider}-${row.field}`}>
                                  {row.provider} · {row.field} ·{" "}
                                  {row.sanitizedId ?? "present"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="kxd-commercial-admin__muted">
                            No external billing identity stored.
                          </p>
                        )}

                        <div className="kxd-commercial-admin__change-list">
                          <h3>Future Stripe mapping summary</h3>
                          <ul>
                            <li>{billingSnapshot.futureStripeMapping.clientToCustomer}</li>
                            <li>{billingSnapshot.futureStripeMapping.setupFee}</li>
                            <li>
                              {billingSnapshot.futureStripeMapping.monthlyRetainer}
                            </li>
                            <li>
                              {billingSnapshot.futureStripeMapping.catalogStrategy}
                            </li>
                            <li>
                              {billingSnapshot.futureStripeMapping.explicitNotice}
                            </li>
                          </ul>
                        </div>

                        <div className="kxd-commercial-admin__change-list">
                          <h3>Systems unchanged</h3>
                          <ul>
                            {billingSnapshot.systemsUnchanged.map((row) => (
                              <li key={row}>{row}</li>
                            ))}
                          </ul>
                        </div>

                        <p className="kxd-commercial-admin__muted">
                          Fingerprint {billingSnapshot.fingerprint}
                        </p>

                        <div className="kxd-commercial-admin__actions">
                          <button
                            type="button"
                            className="kxd-commercial-admin__save"
                            onClick={() =>
                              openBillingConfiguration(billingSnapshot)
                            }
                            disabled={billingLoading || billingConfigLoading}
                          >
                            Configure billing details
                          </button>
                          <button
                            type="button"
                            className="kxd-commercial-admin__text-btn"
                            onClick={resetBillingReadiness}
                            disabled={billingLoading}
                          >
                            Close review
                          </button>
                        </div>
                      </>
                    ) : billingLoading ? (
                      <p className="kxd-commercial-admin__muted" role="status">
                        Assessing billing readiness…
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {billingConfigPhase !== "closed" ? (
                  <div
                    className="kxd-commercial-admin__activation kxd-commercial-admin__billing-config"
                    role="region"
                    aria-label="Billing configuration"
                    aria-busy={billingConfigLoading}
                  >
                    <OpsSectionHead label="Billing configuration" />
                    <p className="kxd-commercial-admin__callout" role="note">
                      Internal billing details only. Saving does not activate
                      billing, create Stripe objects, change access, send email,
                      or create invoices.
                    </p>

                    {billingConfigError ? (
                      <p className="kxd-commercial-admin__error" role="alert">
                        {billingConfigError}
                      </p>
                    ) : null}

                    {billingConfigPhase === "form" ? (
                      <>
                        <div className="kxd-commercial-admin__form-grid">
                          <label className="kxd-commercial-admin__field">
                            <span>Currency</span>
                            <select
                              value={billingConfigDraft.currencyCode}
                              onChange={(e) =>
                                setBillingConfigDraft((prev) => ({
                                  ...prev,
                                  currencyCode: e.target.value,
                                }))
                              }
                              disabled={billingConfigLoading}
                            >
                              <option value="">Not configured</option>
                              {BILLING_CURRENCY_CODES.map((code) => (
                                <option key={code} value={code}>
                                  {code.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="kxd-commercial-admin__field">
                            <span>Billing contact</span>
                            <input
                              type="text"
                              autoComplete="off"
                              value={billingConfigDraft.billingContact}
                              onChange={(e) =>
                                setBillingConfigDraft((prev) => ({
                                  ...prev,
                                  billingContact: e.target.value,
                                }))
                              }
                              disabled={billingConfigLoading}
                            />
                          </label>
                          <label className="kxd-commercial-admin__field">
                            <span>Billing email</span>
                            <input
                              type="email"
                              autoComplete="off"
                              value={billingConfigDraft.billingEmail}
                              onChange={(e) =>
                                setBillingConfigDraft((prev) => ({
                                  ...prev,
                                  billingEmail: e.target.value,
                                }))
                              }
                              disabled={billingConfigLoading}
                            />
                          </label>
                          <label className="kxd-commercial-admin__field">
                            <span>Collection method</span>
                            <select
                              value={billingConfigDraft.collectionMethod}
                              onChange={(e) => {
                                const next = e.target.value;
                                setBillingConfigDraft((prev) => ({
                                  ...prev,
                                  collectionMethod: next,
                                  paymentTerms:
                                    next === "charge_automatically"
                                      ? ""
                                      : prev.paymentTerms,
                                }));
                              }}
                              disabled={billingConfigLoading}
                            >
                              <option value="">Not configured</option>
                              {BILLING_COLLECTION_METHODS.map((method) => (
                                <option key={method} value={method}>
                                  {method === "send_invoice"
                                    ? "Send invoice"
                                    : "Charge automatically"}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="kxd-commercial-admin__field">
                            <span>Payment terms</span>
                            <select
                              value={billingConfigDraft.paymentTerms}
                              onChange={(e) =>
                                setBillingConfigDraft((prev) => ({
                                  ...prev,
                                  paymentTerms: e.target.value,
                                }))
                              }
                              disabled={
                                billingConfigLoading ||
                                billingConfigDraft.collectionMethod ===
                                  "charge_automatically"
                              }
                            >
                              <option value="">
                                {billingConfigDraft.collectionMethod ===
                                "charge_automatically"
                                  ? "Not applicable"
                                  : "Not configured"}
                              </option>
                              {BILLING_PAYMENT_TERMS.map((term) => (
                                <option key={term} value={term}>
                                  {term}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="kxd-commercial-admin__field">
                            <span>Tax posture</span>
                            <select
                              value={billingConfigDraft.taxPosture}
                              onChange={(e) =>
                                setBillingConfigDraft((prev) => ({
                                  ...prev,
                                  taxPosture: e.target.value,
                                }))
                              }
                              disabled={billingConfigLoading}
                            >
                              <option value="">Not configured</option>
                              {BILLING_TAX_POSTURES.map((posture) => (
                                <option key={posture} value={posture}>
                                  {posture.replace(/_/g, " ")}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="kxd-commercial-admin__field">
                            <span>Invoice cadence preference</span>
                            <select
                              value={billingConfigDraft.invoiceCadence}
                              onChange={(e) =>
                                setBillingConfigDraft((prev) => ({
                                  ...prev,
                                  invoiceCadence: e.target.value,
                                }))
                              }
                              disabled={billingConfigLoading}
                            >
                              <option value="">Not configured</option>
                              {BILLING_INVOICE_CADENCES.map((cadence) => (
                                <option key={cadence} value={cadence}>
                                  {cadence}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <p className="kxd-commercial-admin__muted">
                          Commercial amounts, plan access, and Stripe identifiers
                          cannot be edited here.
                        </p>
                        <div className="kxd-commercial-admin__actions">
                          <button
                            type="button"
                            className="kxd-commercial-admin__save"
                            onClick={() => void previewBillingConfiguration()}
                            disabled={billingConfigLoading}
                          >
                            {billingConfigLoading
                              ? "Preparing…"
                              : "Review billing configuration"}
                          </button>
                          <button
                            type="button"
                            className="kxd-commercial-admin__text-btn"
                            onClick={resetBillingConfiguration}
                            disabled={billingConfigLoading}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : null}

                    {billingConfigPhase === "preview" && billingConfigPreview ? (
                      <>
                        <p
                          className="kxd-commercial-admin__status"
                          role="status"
                        >
                          {billingConfigurationOperationLabel(
                            billingConfigPreview.operation,
                          )}
                          {" · "}
                          {billingConfigPreview.canApply
                            ? "Ready to confirm"
                            : "Blocked"}
                        </p>
                        <dl className="kxd-commercial-admin__meta">
                          <div>
                            <dt>Commercial terms</dt>
                            <dd>Unchanged</dd>
                          </div>
                          <div>
                            <dt>Access</dt>
                            <dd>Unchanged</dd>
                          </div>
                          <div>
                            <dt>Stripe</dt>
                            <dd>Unchanged</dd>
                          </div>
                          <div>
                            <dt>Resulting readiness</dt>
                            <dd>
                              {billingReadinessStatusLabel(
                                billingConfigPreview.resultingReadiness
                                  .readiness,
                              )}
                            </dd>
                          </div>
                        </dl>

                        {billingConfigPreview.changedFields.length > 0 ? (
                          <div className="kxd-commercial-admin__change-list">
                            <h3>Changed fields</h3>
                            <ul>
                              {billingConfigPreview.changedFields.map((row) => (
                                <li key={row.field}>
                                  {row.label}: {row.from ?? "—"} →{" "}
                                  {row.to ?? "—"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="kxd-commercial-admin__muted">
                            No material configuration changes.
                          </p>
                        )}

                        <div className="kxd-commercial-admin__change-list">
                          <h3>Proposed configuration</h3>
                          <ul>
                            <li>
                              Currency:{" "}
                              {billingConfigPreview.proposed.currencyCode ??
                                "—"}
                            </li>
                            <li>
                              Billing contact:{" "}
                              {[
                                billingConfigPreview.proposed.billingContact,
                                billingConfigPreview.proposed.billingEmail,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </li>
                            <li>
                              Collection method:{" "}
                              {billingConfigPreview.proposed.collectionMethod ??
                                "—"}
                            </li>
                            <li>
                              Payment terms:{" "}
                              {billingConfigPreview.proposed.paymentTerms ??
                                "—"}
                            </li>
                            <li>
                              Tax posture:{" "}
                              {billingConfigPreview.proposed.taxPosture ?? "—"}
                            </li>
                            <li>
                              Invoice cadence preference:{" "}
                              {billingConfigPreview.proposed.invoiceCadence ??
                                "—"}
                            </li>
                          </ul>
                        </div>

                        {billingConfigPreview.current
                          .sanitizedStripeCustomerId ||
                        billingConfigPreview.current
                          .sanitizedStripeSubscriptionId ? (
                          <div className="kxd-commercial-admin__change-list">
                            <h3>External identifiers (read-only)</h3>
                            <ul>
                              {billingConfigPreview.current
                                .sanitizedStripeCustomerId ? (
                                <li>
                                  Stripe customer ·{" "}
                                  {
                                    billingConfigPreview.current
                                      .sanitizedStripeCustomerId
                                  }
                                </li>
                              ) : null}
                              {billingConfigPreview.current
                                .sanitizedStripeSubscriptionId ? (
                                <li>
                                  Stripe subscription ·{" "}
                                  {
                                    billingConfigPreview.current
                                      .sanitizedStripeSubscriptionId
                                  }
                                </li>
                              ) : null}
                            </ul>
                          </div>
                        ) : (
                          <p className="kxd-commercial-admin__muted">
                            No external Stripe identifiers stored.
                          </p>
                        )}

                        {billingConfigPreview.blockers.length > 0 ? (
                          <ul className="kxd-commercial-admin__blockers">
                            {billingConfigPreview.blockers.map((row) => (
                              <li key={row.code}>{row.message}</li>
                            ))}
                          </ul>
                        ) : null}

                        {billingConfigPreview.warnings.length > 0 ? (
                          <ul className="kxd-commercial-admin__warnings">
                            {billingConfigPreview.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        ) : null}

                        <p className="kxd-commercial-admin__muted">
                          Fingerprint {billingConfigPreview.previewFingerprint}
                        </p>

                        {billingConfigPreview.canApply ? (
                          <>
                            <label className="kxd-commercial-admin__ack">
                              <input
                                type="checkbox"
                                checked={billingConfigAcknowledged}
                                onChange={(e) =>
                                  setBillingConfigAcknowledged(e.target.checked)
                                }
                                disabled={billingConfigLoading}
                              />
                              <span>
                                I confirm this saves internal billing
                                configuration only.
                              </span>
                            </label>
                            <label className="kxd-commercial-admin__ack">
                              <input
                                type="checkbox"
                                checked={billingConfigNoActivateAck}
                                onChange={(e) =>
                                  setBillingConfigNoActivateAck(
                                    e.target.checked,
                                  )
                                }
                                disabled={billingConfigLoading}
                              />
                              <span>
                                Configuration does not activate billing, create
                                Stripe objects, invoices, subscriptions, or
                                charges, and does not send email.
                              </span>
                            </label>
                            <div className="kxd-commercial-admin__actions">
                              <button
                                type="button"
                                className="kxd-commercial-admin__save"
                                onClick={() =>
                                  void confirmBillingConfiguration()
                                }
                                disabled={
                                  billingConfigLoading ||
                                  !billingConfigAcknowledged ||
                                  !billingConfigNoActivateAck
                                }
                              >
                                {billingConfigLoading
                                  ? "Saving…"
                                  : "Confirm configuration"}
                              </button>
                              <button
                                type="button"
                                className="kxd-commercial-admin__secondary"
                                onClick={() => setBillingConfigPhase("form")}
                                disabled={billingConfigLoading}
                              >
                                Edit details
                              </button>
                              <button
                                type="button"
                                className="kxd-commercial-admin__text-btn"
                                onClick={resetBillingConfiguration}
                                disabled={billingConfigLoading}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="kxd-commercial-admin__actions">
                            <button
                              type="button"
                              className="kxd-commercial-admin__secondary"
                              onClick={() => setBillingConfigPhase("form")}
                              disabled={billingConfigLoading}
                            >
                              Edit details
                            </button>
                            <button
                              type="button"
                              className="kxd-commercial-admin__text-btn"
                              onClick={resetBillingConfiguration}
                              disabled={billingConfigLoading}
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </>
                    ) : null}

                    {billingConfigPhase === "result" && billingConfigResult ? (
                      <>
                        <p
                          className="kxd-commercial-admin__status kxd-commercial-admin__status--active"
                          role="status"
                        >
                          {billingConfigResult.message}
                        </p>
                        <dl className="kxd-commercial-admin__meta">
                          <div>
                            <dt>Result</dt>
                            <dd>{billingConfigResult.status}</dd>
                          </div>
                          <div>
                            <dt>Readiness</dt>
                            <dd>
                              {billingReadinessStatusLabel(
                                billingConfigResult.readiness.readiness,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Notices</dt>
                            <dd>
                              No billing action performed · Stripe unchanged ·
                              Access unchanged
                            </dd>
                          </div>
                        </dl>
                        <div className="kxd-commercial-admin__actions">
                          <button
                            type="button"
                            className="kxd-commercial-admin__text-btn"
                            onClick={resetBillingConfiguration}
                          >
                            Close
                          </button>
                        </div>
                      </>
                    ) : null}

                    {billingConfigLoading &&
                    billingConfigPhase === "preview" &&
                    !billingConfigPreview ? (
                      <p className="kxd-commercial-admin__muted" role="status">
                        Generating billing-configuration preview…
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
