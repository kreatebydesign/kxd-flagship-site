"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  LAUNCH_WIZARD_STEPS,
  buildLaunchConfirmationSummary,
  LAUNCH_STAGE_DEFINITIONS,
  buildLaunchStages,
  buildLaunchStepProgress,
  buildPackageCapabilityPreview,
  canNavigateToStep,
  computeLaunchReadiness,
  groupModulesByCategory,
  launchModuleLabel,
  listLaunchExperienceOptions,
  listLaunchPackagePresets,
  moduleAvailabilityForPackage,
  nextOptimisticLaunchStage,
  normalizeClientSlug,
  packageCapabilitySummaryLines,
  resolvePackageModuleSelections,
  validateIdentityStep,
  type LaunchStageId,
  type LaunchWizardDraftPayload,
  type LaunchWizardDraftRecord,
  type LaunchWizardResult,
  type LaunchWizardStepId,
  type LaunchWizardTeamMember,
} from "@/lib/client-launch-wizard";
import { formatReportingSyncHourPacificLabel as formatHour } from "@/lib/reporting/operations/sync-hour";

type Props = {
  initialDraft: LaunchWizardDraftRecord;
  openDrafts: LaunchWizardDraftRecord[];
};

type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

type SlugAvailability = {
  available: boolean;
  takenByClient: boolean;
  takenByDraft: boolean;
  checking: boolean;
};

type Uniqueness = {
  slugTakenByClient?: boolean;
  slugTakenByDraft?: boolean;
  nameTakenByClient?: boolean;
};

const INTENTION_OPTIONS = [
  { value: "not-included", label: "Not included" },
  { value: "requested", label: "Requested" },
  { value: "configured", label: "Configured" },
  { value: "needs-authorization", label: "Needs authorization" },
  { value: "awaiting-client", label: "Awaiting client" },
] as const;

const STAGE_TICK_MS = 700;
const SLUG_CHECK_MS = 450;
const LAUNCH_POLL_MS = 2000;

function nextStepId(current: LaunchWizardStepId): LaunchWizardStepId | null {
  const index = LAUNCH_WIZARD_STEPS.findIndex((step) => step.id === current);
  return LAUNCH_WIZARD_STEPS[index + 1]?.id ?? null;
}

function prevStepId(current: LaunchWizardStepId): LaunchWizardStepId | null {
  const index = LAUNCH_WIZARD_STEPS.findIndex((step) => step.id === current);
  return LAUNCH_WIZARD_STEPS[index - 1]?.id ?? null;
}

function initialSlugManuallyEdited(payload: LaunchWizardDraftPayload): boolean {
  const name = payload.identity.businessName.trim();
  const slug = payload.identity.clientSlug.trim();
  if (!slug) return false;
  if (!name) return true;
  return slug !== normalizeClientSlug(name);
}

function saveStateLabel(state: SaveState): string {
  switch (state) {
    case "unsaved":
      return "Unsaved changes";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "error":
      return "Save failed";
    default:
      return "Up to date";
  }
}

function availabilityLabel(
  availability: ReturnType<typeof moduleAvailabilityForPackage>,
  source: LaunchWizardDraftPayload["modules"][number]["source"],
): string {
  const base =
    availability === "included"
      ? "Included"
      : availability === "optional"
        ? "Optional"
        : availability === "coming-soon"
          ? "Coming later"
          : "Unavailable";
  if (source === "custom-override") return `${base} · custom`;
  return base;
}

const STEP_HEADING: Record<
  LaunchWizardStepId,
  { title: string; lead: string }
> = {
  identity: {
    title: "Who is this client?",
    lead: "Name, contact, and workspace slug. Nothing is activated yet.",
  },
  package: {
    title: "What capabilities do they receive?",
    lead: "Choose the operating surface. Higher packages expand what KXD OS can run for them.",
  },
  experience: {
    title: "What experience will they see?",
    lead: "Portal language and presentation direction for this workspace.",
  },
  modules: {
    title: "Enabled modules",
    lead: "Package includes are locked. Optional and custom selections stay on the draft until launch.",
  },
  infrastructure: {
    title: "Connections and URLs",
    lead: "Record intentions. Live authorization happens after launch.",
  },
  team: {
    title: "Portal access",
    lead: "People who will use the client workspace. Email invitations are not sent yet.",
  },
  automation: {
    title: "Reporting rhythm",
    lead: "Schedule and entitled providers. Inactive until launch.",
  },
  review: {
    title: "Ready to Launch",
    lead: "Confirm what will be created, what still waits, and what can wait.",
  },
  launch: {
    title: "Ready to Launch",
    lead: "Confirm what will be created, what still waits, and what can wait.",
  },
};

function stateLabel(state: string): string {
  return state.replace(/-/g, " ");
}

function groupReadinessCategories(
  categories: ReturnType<typeof computeLaunchReadiness>["categories"],
) {
  const buckets = {
    blocked: [] as typeof categories,
    awaiting: [] as typeof categories,
    optional: [] as typeof categories,
    ready: [] as typeof categories,
  };
  for (const category of categories) {
    if (category.state === "blocked") buckets.blocked.push(category);
    else if (
      category.state === "awaiting-configuration" ||
      category.state === "awaiting-client"
    ) {
      buckets.awaiting.push(category);
    } else if (
      category.state === "optional" ||
      category.state === "not-included"
    ) {
      buckets.optional.push(category);
    } else {
      buckets.ready.push(category);
    }
  }
  return buckets;
}

function minimalLaunchedResult(draft: LaunchWizardDraftRecord): LaunchWizardResult {
  const clientId = draft.launchedClientId ?? 0;
  const packageId = draft.payload.package.packageId;
  const presetLabel =
    listLaunchPackagePresets().find((p) => p.id === packageId)?.catalogLabel ??
    packageId;
  return {
    success: true,
    launchOperationId: draft.launchOperationId ?? "",
    clientId,
    clientName: draft.payload.identity.businessName || "Client",
    clientSlug: draft.payload.identity.clientSlug,
    packageId,
    packageLabel: presetLabel,
    experienceChoiceId: draft.payload.experience.choiceId,
    modulesEnabled: draft.payload.modules
      .filter((row) => row.selected)
      .map((row) => launchModuleLabel(row.moduleId)),
    portalUsersCreated: draft.payload.team
      .filter((member) => member.inviteOnLaunch)
      .map((member) => ({
        email: member.email,
        role: member.role,
        inviteQueued: false,
      })),
    portalUsersPending: draft.payload.team
      .filter((member) => !member.inviteOnLaunch)
      .map((member) => ({ email: member.email, role: member.role })),
    reportingProviders: [],
    automationEnabled: draft.payload.automation.reportingAutomationEnabled,
    syncHourPacific: draft.payload.automation.syncHourPacific,
    followUps: [],
    adminWorkspaceUrl: `/admin/operations/clients/${clientId}`,
    portalUrl: "/portal",
  };
}

function fieldError(
  issues: ReturnType<typeof validateIdentityStep>,
  field: string,
): string | null {
  return issues.find((issue) => issue.field === field)?.message ?? null;
}

export function ClientLaunchWizardShell({ initialDraft, openDrafts }: Props) {
  const [draft, setDraft] = useState(initialDraft);
  const [payload, setPayload] = useState<LaunchWizardDraftPayload>(
    initialDraft.payload,
  );
  const [error, setError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [result, setResult] = useState<LaunchWizardResult | null>(
    initialDraft.status === "launched" ? minimalLaunchedResult(initialDraft) : null,
  );
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(() =>
    initialSlugManuallyEdited(initialDraft.payload),
  );
  const [slugAvailability, setSlugAvailability] = useState<SlugAvailability>({
    available: true,
    takenByClient: false,
    takenByDraft: false,
    checking: false,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [launchSubmitting, setLaunchSubmitting] = useState(false);
  const [launchPhase, setLaunchPhase] = useState<
    "idle" | "running" | "success" | "failed"
  >(
    initialDraft.status === "launching"
      ? "running"
      : initialDraft.status === "launched"
        ? "success"
        : initialDraft.status === "failed"
          ? "failed"
          : "idle",
  );
  const [activeStageId, setActiveStageId] = useState<LaunchStageId | null>(
    initialDraft.status === "launching"
      ? LAUNCH_STAGE_DEFINITIONS[0]?.id ?? "validating"
      : null,
  );
  const [failedStageId, setFailedStageId] = useState<LaunchStageId | null>(null);
  const [pending, startTransition] = useTransition();

  const launchInFlightRef = useRef(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const packages = useMemo(() => listLaunchPackagePresets(), []);
  const experiences = useMemo(() => listLaunchExperienceOptions(), []);

  const uniqueness: Uniqueness = useMemo(
    () => ({
      slugTakenByClient: slugAvailability.takenByClient,
      slugTakenByDraft: slugAvailability.takenByDraft,
    }),
    [slugAvailability.takenByClient, slugAvailability.takenByDraft],
  );

  const readiness = useMemo(
    () => computeLaunchReadiness(payload, uniqueness),
    [payload, uniqueness],
  );

  const stepProgress = useMemo(
    () =>
      buildLaunchStepProgress({
        currentStep: draft.currentStep,
        payload,
        uniqueness,
      }),
    [draft.currentStep, payload, uniqueness],
  );

  const identityIssues = useMemo(
    () => validateIdentityStep(payload.identity, uniqueness),
    [payload.identity, uniqueness],
  );

  const moduleGroups = useMemo(
    () => groupModulesByCategory(payload.modules),
    [payload.modules],
  );

  const capabilityPreview = useMemo(
    () => buildPackageCapabilityPreview(payload.package.packageId),
    [payload.package.packageId],
  );

  const confirmation = useMemo(
    () => buildLaunchConfirmationSummary(payload),
    [payload],
  );

  const stages = useMemo(
    () =>
      buildLaunchStages({
        phase: launchPhase,
        activeStageId,
        failedStageId,
      }),
    [launchPhase, activeStageId, failedStageId],
  );

  const readinessGroups = useMemo(
    () => groupReadinessCategories(readiness.categories),
    [readiness.categories],
  );

  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === payload.package.packageId) ?? null,
    [packages, payload.package.packageId],
  );

  const step = draft.currentStep;
  const stepCopy = STEP_HEADING[step];
  const showResult =
    launchPhase === "success" || draft.status === "launched" || result != null;
  const showLaunchStages =
    (launchPhase === "running" ||
      launchPhase === "failed" ||
      draft.status === "launching") &&
    !showResult;

  const markUnsaved = useCallback(() => {
    setSaveState((prev) => (prev === "saving" ? prev : "unsaved"));
  }, []);

  const applyDraftRecord = useCallback((next: LaunchWizardDraftRecord) => {
    setDraft(next);
    setPayload(next.payload);
    setSaveState("saved");
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setSaveState("idle"), 1800);
  }, []);

  const updatePayload = useCallback(
    (updater: (prev: LaunchWizardDraftPayload) => LaunchWizardDraftPayload) => {
      setPayload((prev) => updater(prev));
      markUnsaved();
    },
    [markUnsaved],
  );

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState === "unsaved" || saveState === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  useEffect(() => {
    const slug = payload.identity.clientSlug.trim();
    if (!slug) {
      setSlugAvailability({
        available: true,
        takenByClient: false,
        takenByDraft: false,
        checking: false,
      });
      return;
    }

    setSlugAvailability((prev) => ({ ...prev, checking: true }));
    if (slugCheckRef.current) clearTimeout(slugCheckRef.current);
    slugCheckRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/client-launch-wizard/slug?slug=${encodeURIComponent(slug)}&draftId=${encodeURIComponent(String(draft.id))}`,
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          setSlugAvailability((prev) => ({ ...prev, checking: false }));
          return;
        }
        setSlugAvailability({
          available: Boolean(data.available),
          takenByClient: Boolean(data.takenByClient),
          takenByDraft: Boolean(data.takenByDraft),
          checking: false,
        });
      } catch {
        setSlugAvailability((prev) => ({ ...prev, checking: false }));
      }
    }, SLUG_CHECK_MS);

    return () => {
      if (slugCheckRef.current) clearTimeout(slugCheckRef.current);
    };
  }, [payload.identity.clientSlug, draft.id]);

  const stopStageTicker = useCallback(() => {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }, []);

  const startStageTicker = useCallback(() => {
    stopStageTicker();
    setActiveStageId("validating");
    stageTimerRef.current = setInterval(() => {
      setActiveStageId((current) => nextOptimisticLaunchStage(current));
    }, STAGE_TICK_MS);
  }, [stopStageTicker]);

  const stopLaunchPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollLaunchDraft = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/client-launch-wizard/drafts/${draft.id}`,
      );
      const data = await response.json();
      if (!response.ok || !data.success || !data.draft) return;

      const next = data.draft as LaunchWizardDraftRecord;
      setDraft(next);
      setPayload(next.payload);

      if (next.status === "launched") {
        stopStageTicker();
        stopLaunchPoll();
        setLaunchPhase("success");
        setActiveStageId(null);
        setResult(minimalLaunchedResult(next));
        launchInFlightRef.current = false;
        setLaunchSubmitting(false);
      } else if (next.status === "failed") {
        stopStageTicker();
        stopLaunchPoll();
        setLaunchPhase("failed");
        setFailedStageId((prev) => prev ?? activeStageId ?? "finalizing");
        setError(
          next.failureSummary ||
            "Launch did not finish. Review the failed stage and try again.",
        );
        launchInFlightRef.current = false;
        setLaunchSubmitting(false);
      }
    } catch {
      // Keep polling while status remains launching.
    }
  }, [
    activeStageId,
    draft.id,
    stopLaunchPoll,
    stopStageTicker,
  ]);

  useEffect(() => {
    if (initialDraft.status !== "launching") return;
    setLaunchPhase("running");
    startStageTicker();
    void pollLaunchDraft();
    pollTimerRef.current = setInterval(() => {
      void pollLaunchDraft();
    }, LAUNCH_POLL_MS);
    return () => {
      stopStageTicker();
      stopLaunchPoll();
    };
    // Recovery boot once from initial draft status.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraft.id, initialDraft.status]);

  useEffect(() => {
    return () => {
      stopStageTicker();
      stopLaunchPoll();
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      if (slugCheckRef.current) clearTimeout(slugCheckRef.current);
    };
  }, [stopLaunchPoll, stopStageTicker]);

  async function persist(options: {
    stepId: LaunchWizardStepId;
    nextStep?: LaunchWizardStepId;
    patch?: Partial<LaunchWizardDraftPayload>;
  }): Promise<boolean> {
    setError(null);
    setConflictMessage(null);
    setSaveState("saving");

    const response = await fetch(
      `/api/admin/client-launch-wizard/drafts/${draft.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: options.stepId,
          nextStep: options.nextStep,
          patch: options.patch ?? payload,
          expectedUpdatedAt: draft.updatedAt,
        }),
      },
    );
    const data = await response.json();

    if (response.status === 409 && data.draft) {
      applyDraftRecord(data.draft as LaunchWizardDraftRecord);
      setConflictMessage(
        data.message ||
          "This draft was updated elsewhere. Loaded the latest saved version.",
      );
      setSaveState("idle");
      return false;
    }

    if (!response.ok || !data.success) {
      setSaveState("error");
      setError(data.message || "Could not save this step.");
      if (data.draft) {
        applyDraftRecord(data.draft as LaunchWizardDraftRecord);
      }
      return false;
    }

    applyDraftRecord(data.draft as LaunchWizardDraftRecord);
    return true;
  }

  function goNext() {
    const next = nextStepId(step);
    startTransition(async () => {
      const ok = await persist({
        stepId: step,
        nextStep: next ?? step,
        patch: payload,
      });
      if (!ok) return;
    });
  }

  function goBack() {
    const prev = prevStepId(step);
    if (!prev) return;
    startTransition(async () => {
      await persist({ stepId: step, nextStep: prev, patch: payload });
    });
  }

  function saveOnly() {
    startTransition(async () => {
      await persist({ stepId: step, patch: payload });
    });
  }

  function navigateToStep(target: LaunchWizardStepId) {
    if (target === step) return;
    const nav = canNavigateToStep(target, payload, uniqueness);
    if (!nav.ok) {
      setError(nav.message);
      return;
    }
    startTransition(async () => {
      await persist({ stepId: step, nextStep: target, patch: payload });
    });
  }

  function openLaunchConfirm() {
    setError(null);
    if (!readiness.canLaunch) {
      setError("Resolve launch blockers before continuing.");
      return;
    }
    setConfirmOpen(true);
  }

  function executeLaunch() {
    if (launchInFlightRef.current || launchSubmitting) return;
    launchInFlightRef.current = true;
    setLaunchSubmitting(true);
    setConfirmOpen(false);
    setError(null);
    setFailedStageId(null);
    setLaunchPhase("running");
    startStageTicker();

    startTransition(async () => {
      const saved = await persist({
        stepId: "review",
        nextStep: "review",
        patch: payload,
      });
      if (!saved) {
        stopStageTicker();
        setLaunchPhase("idle");
        launchInFlightRef.current = false;
        setLaunchSubmitting(false);
        return;
      }

      try {
        const response = await fetch(
          "/api/admin/client-launch-wizard/launch",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftId: draft.id }),
          },
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          stopStageTicker();
          setLaunchPhase("failed");
          setFailedStageId(activeStageId ?? "finalizing");
          setError(
            data.message ||
              "Launch failed. No partial client activation is assumed complete.",
          );
          if (data.draft) {
            setDraft(data.draft);
            setPayload(data.draft.payload);
          }
          launchInFlightRef.current = false;
          setLaunchSubmitting(false);
          return;
        }

        stopStageTicker();
        setLaunchPhase("success");
        setDraft(data.draft);
        setPayload(data.draft.payload);
        setResult(data.result ?? minimalLaunchedResult(data.draft));
        launchInFlightRef.current = false;
        setLaunchSubmitting(false);
      } catch {
        stopStageTicker();
        setLaunchPhase("failed");
        setFailedStageId(activeStageId ?? "finalizing");
        setError("Launch request failed. Check the draft status and retry.");
        launchInFlightRef.current = false;
        setLaunchSubmitting(false);
      }
    });
  }

  function updateIdentity<K extends keyof LaunchWizardDraftPayload["identity"]>(
    key: K,
    value: LaunchWizardDraftPayload["identity"][K],
  ) {
    updatePayload((prev) => {
      const identity = { ...prev.identity, [key]: value };
      if (key === "businessName" && !slugManuallyEdited) {
        identity.clientSlug = normalizeClientSlug(String(value));
      }
      if (key === "clientSlug") {
        identity.clientSlug = normalizeClientSlug(String(value));
      }
      return { ...prev, identity };
    });
    if (key === "clientSlug") {
      setSlugManuallyEdited(true);
    }
  }

  function resetSlug() {
    setSlugManuallyEdited(false);
    updatePayload((prev) => ({
      ...prev,
      identity: {
        ...prev.identity,
        clientSlug: normalizeClientSlug(prev.identity.businessName),
      },
    }));
  }

  function selectPackage(packageId: LaunchWizardDraftPayload["package"]["packageId"]) {
    const preset = packages.find((item) => item.id === packageId);
    updatePayload((prev) => ({
      ...prev,
      package: { packageId, displayName: "" },
      modules: resolvePackageModuleSelections(packageId, prev.modules),
      automation: {
        ...prev.automation,
        ...(preset?.automationDefaults ?? {}),
      },
    }));
  }

  function addTeamMember() {
    const member: LaunchWizardTeamMember = {
      id: `m-${Date.now()}`,
      name: "",
      email: "",
      role: "collaborator",
      isPrimaryContact: payload.team.length === 0,
      inviteOnLaunch: true,
    };
    updatePayload((prev) => ({ ...prev, team: [...prev.team, member] }));
  }

  function removeTeamMember(id: string) {
    updatePayload((prev) => ({
      ...prev,
      team: prev.team.filter((member) => member.id !== id),
    }));
  }

  const resultView = result ?? (draft.launchedClientId ? minimalLaunchedResult(draft) : null);

  if (showResult && resultView) {
    return (
      <div className="kxd-launch-wizard kxd-launch-wizard--result">
        <header className="kxd-launch-wizard__hero">
          <p className="kxd-launch-wizard__eyebrow">Launched</p>
          <h1 className="kxd-launch-wizard__title">
            {resultView.clientName || draft.payload.identity.businessName}
          </h1>
          <p className="kxd-launch-wizard__lead">
            The workspace exists. Remaining integrations stay listed until
            authorized — never marked connected early.
          </p>
        </header>

        <ol className="kxd-launch-wizard__stages kxd-launch-wizard__stages--compact" aria-label="Launch stages">
          {buildLaunchStages({ phase: "success" }).map((stage) => (
            <li key={stage.id} data-state={stage.state}>
              <span className="kxd-launch-wizard__stage-mark" aria-hidden />
              {stage.label}
            </li>
          ))}
        </ol>

        <section className="kxd-launch-wizard__result">
          <div className="kxd-launch-wizard__result-summary">
            <div>
              <span>Client</span>
              <strong>{resultView.clientName}</strong>
            </div>
            <div>
              <span>Package</span>
              <strong>{resultView.packageLabel}</strong>
            </div>
            <div>
              <span>Experience</span>
              <strong>{resultView.experienceChoiceId}</strong>
            </div>
            <div>
              <span>Workspace</span>
              <strong className="kxd-launch-wizard__url">
                {resultView.adminWorkspaceUrl ||
                  `/admin/operations/clients/${draft.launchedClientId}`}
              </strong>
            </div>
            <div>
              <span>Portal</span>
              <strong className="kxd-launch-wizard__url">
                {resultView.portalUrl || "—"}
              </strong>
            </div>
            <div>
              <span>Reporting</span>
              <strong>
                {resultView.reportingProviders.length
                  ? resultView.reportingProviders.join(", ")
                  : "None entitled at launch"}
              </strong>
            </div>
            <div>
              <span>Automation</span>
              <strong>
                {resultView.automationEnabled
                  ? formatHour(resultView.syncHourPacific)
                  : "Off"}
              </strong>
            </div>
            <div>
              <span>Portal users</span>
              <strong>
                {resultView.portalUsersCreated.length
                  ? `${resultView.portalUsersCreated.length} created · email not sent`
                  : "None created"}
              </strong>
            </div>
          </div>

          {resultView.modulesEnabled.length ? (
            <div className="kxd-launch-wizard__chip-row" aria-label="Enabled modules">
              {resultView.modulesEnabled.map((moduleName) => (
                <span key={moduleName} className="kxd-launch-wizard__chip">
                  {moduleName}
                </span>
              ))}
            </div>
          ) : null}

          {resultView.followUps.length ? (
            <div className="kxd-launch-wizard__followups">
              <h2>Next</h2>
              <ul>
                {resultView.followUps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="kxd-launch-wizard__hint">
              No outstanding follow-ups from launch.
            </p>
          )}

          <div className="kxd-launch-wizard__result-actions">
            <a
              className="kxd-launch-wizard__primary"
              href={
                resultView.adminWorkspaceUrl ||
                `/admin/operations/clients/${draft.launchedClientId}`
              }
            >
              Open Client Workspace
            </a>
            <a
              className="kxd-launch-wizard__secondary"
              href={
                resultView.adminWorkspaceUrl ||
                `/admin/operations/clients/${draft.launchedClientId}`
              }
            >
              Continue Setup
            </a>
            {resultView.portalUrl ? (
              <a className="kxd-launch-wizard__ghost" href={resultView.portalUrl}>
                Open Portal
              </a>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  if (showLaunchStages) {
    return (
      <div className="kxd-launch-wizard kxd-launch-wizard--launching">
        <header className="kxd-launch-wizard__hero">
          <p className="kxd-launch-wizard__eyebrow">Launching</p>
          <h1 className="kxd-launch-wizard__title">
            {payload.identity.businessName.trim() || "Client"}
          </h1>
          <p className="kxd-launch-wizard__lead">
            {launchPhase === "failed"
              ? "Stopped at the failed stage. Retry when ready."
              : "Running the launch sequence."}
          </p>
        </header>

        <ol className="kxd-launch-wizard__stages" aria-label="Launch stages">
          {stages.map((stage) => (
            <li key={stage.id} data-state={stage.state}>
              <span className="kxd-launch-wizard__stage-mark" aria-hidden />
              <span className="kxd-launch-wizard__stage-label">{stage.label}</span>
              <span className="kxd-launch-wizard__stage-state">
                {stage.state === "active"
                  ? "In progress"
                  : stage.state === "complete"
                    ? "Done"
                    : stage.state === "failed"
                      ? "Failed"
                      : "Waiting"}
              </span>
            </li>
          ))}
        </ol>

        {error ? <p className="kxd-launch-wizard__error">{error}</p> : null}

        {launchPhase === "failed" ? (
          <footer className="kxd-launch-wizard__footer">
            <button
              type="button"
              className="kxd-launch-wizard__primary"
              onClick={() => {
                setLaunchPhase("idle");
                setFailedStageId(null);
                setActiveStageId(null);
                setError(null);
              }}
            >
              Return to review
            </button>
          </footer>
        ) : null}
      </div>
    );
  }

  return (
    <div className="kxd-launch-wizard">
      <header className="kxd-launch-wizard__hero">
        <div className="kxd-launch-wizard__hero-row">
          <div>
            <p className="kxd-launch-wizard__eyebrow">Client Launch</p>
            <h1 className="kxd-launch-wizard__title">
              {payload.identity.businessName.trim() || "New client"}
            </h1>
            <p className="kxd-launch-wizard__lead">
              Draft saves as you go. Nothing activates until you confirm launch.
            </p>
          </div>
          <p
            className="kxd-launch-wizard__save-state"
            data-state={saveState}
            aria-live="polite"
          >
            {saveStateLabel(saveState)}
          </p>
        </div>
      </header>

      {openDrafts.length > 1 ? (
        <aside className="kxd-launch-wizard__resume">
          <p>Other open drafts</p>
          <ul>
            {openDrafts
              .filter((item) => String(item.id) !== String(draft.id))
              .map((item) => (
                <li key={item.id}>
                  <Link href={`/admin/operations/clients/launch/${item.id}`}>
                    {item.payload.identity.businessName || `Draft ${item.id}`} ·{" "}
                    {item.currentStep}
                  </Link>
                </li>
              ))}
          </ul>
        </aside>
      ) : null}

      <nav className="kxd-launch-wizard__progress" aria-label="Launch progress">
        <ol className="kxd-launch-wizard__steps">
          {stepProgress.map((item) => (
            <li key={item.id} className={`is-${item.state}`} data-state={item.state}>
              <button
                type="button"
                className={`is-${item.state}`}
                onClick={() => navigateToStep(item.id)}
                disabled={pending || item.state === "locked"}
              >
                <span>{item.short}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {conflictMessage ? (
        <p className="kxd-launch-wizard__error" role="status">
          {conflictMessage}
        </p>
      ) : null}
      {error ? <p className="kxd-launch-wizard__error">{error}</p> : null}

      <section className="kxd-launch-wizard__panel" data-step={step}>
        {step === "identity" ? (
          <div className="kxd-launch-wizard__fields">
            <header className="kxd-launch-wizard__step-head">
              <h2>{stepCopy.title}</h2>
              <p className="kxd-launch-wizard__hint">{stepCopy.lead}</p>
            </header>
            <div className="kxd-launch-wizard__field-grid">
            <label className="kxd-launch-wizard__field kxd-launch-wizard__field--wide">
              Business name
              <span className="kxd-launch-wizard__req">Required</span>
              <input
                value={payload.identity.businessName}
                onChange={(e) => updateIdentity("businessName", e.target.value)}
                aria-invalid={Boolean(fieldError(identityIssues, "businessName"))}
              />
              {fieldError(identityIssues, "businessName") ? (
                <span className="kxd-launch-wizard__field-error">
                  {fieldError(identityIssues, "businessName")}
                </span>
              ) : null}
            </label>
            <label className="kxd-launch-wizard__field">
              Workspace slug
              <span className="kxd-launch-wizard__req">Required</span>
              <input
                value={payload.identity.clientSlug}
                onChange={(e) => updateIdentity("clientSlug", e.target.value)}
                aria-invalid={Boolean(fieldError(identityIssues, "clientSlug"))}
              />
              <span
                className="kxd-launch-wizard__slug-status"
                data-state={
                  slugAvailability.checking
                    ? "checking"
                    : !payload.identity.clientSlug.trim()
                      ? "empty"
                      : slugAvailability.available
                        ? "available"
                        : "taken"
                }
              >
                {slugAvailability.checking
                  ? "Checking…"
                  : !payload.identity.clientSlug.trim()
                    ? "Suggested from the business name"
                    : slugAvailability.takenByClient
                      ? "Taken by an existing client"
                      : slugAvailability.takenByDraft
                        ? "Taken by another draft"
                        : "Available"}
              </span>
              <button
                type="button"
                className="kxd-launch-wizard__text-btn"
                onClick={resetSlug}
              >
                Reset slug
              </button>
              {fieldError(identityIssues, "clientSlug") ? (
                <span className="kxd-launch-wizard__field-error">
                  {fieldError(identityIssues, "clientSlug")}
                </span>
              ) : null}
            </label>
            <label className="kxd-launch-wizard__field">
              Primary contact
              <span className="kxd-launch-wizard__req">Required</span>
              <input
                value={payload.identity.primaryContactName}
                onChange={(e) =>
                  updateIdentity("primaryContactName", e.target.value)
                }
                aria-invalid={Boolean(
                  fieldError(identityIssues, "primaryContactName"),
                )}
              />
              {fieldError(identityIssues, "primaryContactName") ? (
                <span className="kxd-launch-wizard__field-error">
                  {fieldError(identityIssues, "primaryContactName")}
                </span>
              ) : null}
            </label>
            <label className="kxd-launch-wizard__field">
              Contact email
              <span className="kxd-launch-wizard__req">Required</span>
              <input
                value={payload.identity.primaryContactEmail}
                onChange={(e) =>
                  updateIdentity("primaryContactEmail", e.target.value)
                }
                aria-invalid={Boolean(
                  fieldError(identityIssues, "primaryContactEmail"),
                )}
              />
              {fieldError(identityIssues, "primaryContactEmail") ? (
                <span className="kxd-launch-wizard__field-error">
                  {fieldError(identityIssues, "primaryContactEmail")}
                </span>
              ) : null}
            </label>
            <label className="kxd-launch-wizard__field">
              Phone
              <span className="kxd-launch-wizard__opt">Optional</span>
              <input
                value={payload.identity.phone}
                onChange={(e) => updateIdentity("phone", e.target.value)}
              />
            </label>
            <label className="kxd-launch-wizard__field">
              Website
              <span className="kxd-launch-wizard__opt">Optional</span>
              <input
                value={payload.identity.companyWebsite}
                onChange={(e) => updateIdentity("companyWebsite", e.target.value)}
                aria-invalid={Boolean(
                  fieldError(identityIssues, "companyWebsite"),
                )}
              />
              {fieldError(identityIssues, "companyWebsite") ? (
                <span className="kxd-launch-wizard__field-error">
                  {fieldError(identityIssues, "companyWebsite")}
                </span>
              ) : null}
            </label>
            <label className="kxd-launch-wizard__field">
              Industry
              <span className="kxd-launch-wizard__opt">Optional</span>
              <input
                value={payload.identity.industry}
                onChange={(e) => updateIdentity("industry", e.target.value)}
              />
            </label>
            <label className="kxd-launch-wizard__field">
              City / region
              <span className="kxd-launch-wizard__opt">Optional</span>
              <input
                value={payload.identity.serviceRegion}
                onChange={(e) => updateIdentity("serviceRegion", e.target.value)}
              />
            </label>
            <label className="kxd-launch-wizard__field kxd-launch-wizard__field--wide">
              Internal notes
              <span className="kxd-launch-wizard__opt">Optional</span>
              <textarea
                value={payload.identity.internalNotes}
                onChange={(e) => updateIdentity("internalNotes", e.target.value)}
              />
            </label>
            </div>
          </div>
        ) : null}

        {step === "package" ? (
          <div className="kxd-launch-wizard__packages">
            <header className="kxd-launch-wizard__step-head">
              <h2>{stepCopy.title}</h2>
              <p className="kxd-launch-wizard__hint">{stepCopy.lead}</p>
            </header>
            <div className="kxd-launch-wizard__package-grid">
              {packages.map((preset) => {
                const selected = payload.package.packageId === preset.id;
                const lines = packageCapabilitySummaryLines(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-tier={preset.id}
                    className={
                      selected
                        ? "kxd-launch-wizard__package is-selected"
                        : "kxd-launch-wizard__package"
                    }
                    onClick={() => selectPackage(preset.id)}
                  >
                    <div className="kxd-launch-wizard__package-top">
                      <strong>{preset.catalogLabel}</strong>
                      {selected ? (
                        <span className="kxd-launch-wizard__selected-mark">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <span className="kxd-launch-wizard__package-fit">
                      {preset.intendedFit}
                    </span>
                    <ul className="kxd-launch-wizard__capability-lines">
                      {lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <div className="kxd-launch-wizard__capability">
              <header className="kxd-launch-wizard__step-head">
                <h3>
                  {selectedPackage
                    ? `${selectedPackage.catalogLabel} capabilities`
                    : "Capabilities"}
                </h3>
                <p className="kxd-launch-wizard__hint">
                  From the selected package. Not marketing copy.
                </p>
              </header>
              <div className="kxd-launch-wizard__capability-grid">
                {capabilityPreview.map((row) => (
                  <article key={row.areaId} data-state={row.state}>
                    <strong>{row.label}</strong>
                    <span>{stateLabel(row.state)}</span>
                    <p>{row.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === "experience" ? (
          <div className="kxd-launch-wizard__packages">
            <header className="kxd-launch-wizard__step-head">
              <h2>{stepCopy.title}</h2>
              <p className="kxd-launch-wizard__hint">{stepCopy.lead}</p>
            </header>
            <div className="kxd-launch-wizard__experience-grid">
              {experiences.map((option) => {
                const selected =
                  payload.experience.choiceId === option.choiceId;
                return (
                  <button
                    key={option.choiceId}
                    type="button"
                    className={
                      selected
                        ? "kxd-launch-wizard__experience is-selected"
                        : "kxd-launch-wizard__experience"
                    }
                    onClick={() =>
                      updatePayload((prev) => ({
                        ...prev,
                        experience: {
                          choiceId: option.choiceId,
                          presentationSlug:
                            option.choiceId === "default" ||
                            option.choiceId === "custom"
                              ? null
                              : option.choiceId,
                          notes: "",
                        },
                      }))
                    }
                  >
                    <div className="kxd-launch-wizard__package-top">
                      <strong>{option.label}</strong>
                      {selected ? (
                        <span className="kxd-launch-wizard__selected-mark">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <span className="kxd-launch-wizard__package-fit">
                      {option.summary}
                    </span>
                    <p className="kxd-launch-wizard__experience-meta">
                      {option.portalLanguage}
                      {" · "}
                      {option.presentationConfigured
                        ? option.presentationStyle
                        : "Fallback until configured"}
                    </p>
                    <div className="kxd-launch-wizard__status-row">
                      <span data-on={option.epEnabled ? "true" : "false"}>
                        Executive Performance {option.epEnabled ? "on" : "off"}
                      </span>
                      <span data-on={option.briefingEnabled ? "true" : "false"}>
                        Briefing {option.briefingEnabled ? "on" : "off"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === "modules" ? (
          <div className="kxd-launch-wizard__fields">
            <header className="kxd-launch-wizard__step-head">
              <h2>{stepCopy.title}</h2>
              <p className="kxd-launch-wizard__hint">{stepCopy.lead}</p>
            </header>
            {moduleGroups.map((group) => (
              <div key={group.categoryId} className="kxd-launch-wizard__module-group">
                <h3>{group.label}</h3>
                <ul className="kxd-launch-wizard__module-list">
                  {group.rows.map((row) => {
                    const availability = moduleAvailabilityForPackage(
                      payload.package.packageId,
                      row.moduleId,
                    );
                    const locked =
                      availability === "included" &&
                      payload.package.packageId !== "custom";
                    return (
                      <li
                        key={row.moduleId}
                        className="kxd-launch-wizard__module-row"
                        data-availability={availability}
                        data-selected={row.selected ? "true" : "false"}
                        data-locked={locked ? "true" : "false"}
                      >
                        <label className="kxd-launch-wizard__check">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={
                              locked ||
                              availability === "coming-soon" ||
                              availability === "unavailable"
                            }
                            onChange={(e) =>
                              updatePayload((prev) => ({
                                ...prev,
                                modules: prev.modules.map((item) =>
                                  item.moduleId === row.moduleId
                                    ? {
                                        ...item,
                                        selected: e.target.checked,
                                        source:
                                          payload.package.packageId === "custom"
                                            ? "custom-override"
                                            : item.source,
                                      }
                                    : item,
                                ),
                              }))
                            }
                          />
                          <span className="kxd-launch-wizard__module-copy">
                            <strong>{launchModuleLabel(row.moduleId)}</strong>
                            <em>
                              {availabilityLabel(availability, row.source)}
                              {locked ? " · package" : ""}
                            </em>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        {step === "infrastructure" ? (
          <div className="kxd-launch-wizard__fields">
            <header className="kxd-launch-wizard__step-head">
              <h2>{stepCopy.title}</h2>
              <p className="kxd-launch-wizard__hint">{stepCopy.lead}</p>
            </header>
            <div className="kxd-launch-wizard__field-grid">
              <label className="kxd-launch-wizard__field">
                Production URL
                <span className="kxd-launch-wizard__opt">Optional</span>
                <input
                  value={payload.infrastructure.productionUrl}
                  onChange={(e) =>
                    updatePayload((prev) => ({
                      ...prev,
                      infrastructure: {
                        ...prev.infrastructure,
                        productionUrl: e.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label className="kxd-launch-wizard__field">
                Preview Website
                <span className="kxd-launch-wizard__opt">Optional</span>
                <input
                  value={payload.infrastructure.stagingUrl}
                  onChange={(e) =>
                    updatePayload((prev) => ({
                      ...prev,
                      infrastructure: {
                        ...prev.infrastructure,
                        stagingUrl: e.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label className="kxd-launch-wizard__field">
                Search Console site
                <span className="kxd-launch-wizard__opt">Optional</span>
                <input
                  value={payload.infrastructure.searchConsoleSiteUrl}
                  onChange={(e) =>
                    updatePayload((prev) => ({
                      ...prev,
                      infrastructure: {
                        ...prev.infrastructure,
                        searchConsoleSiteUrl: e.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label className="kxd-launch-wizard__field">
                GA4 property
                <span className="kxd-launch-wizard__opt">Optional</span>
                <input
                  value={payload.infrastructure.ga4PropertyId}
                  onChange={(e) =>
                    updatePayload((prev) => ({
                      ...prev,
                      infrastructure: {
                        ...prev.infrastructure,
                        ga4PropertyId: e.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label className="kxd-launch-wizard__field">
                Google Ads customer ID
                <span className="kxd-launch-wizard__opt">Optional</span>
                <input
                  value={payload.infrastructure.googleAdsCustomerId}
                  onChange={(e) =>
                    updatePayload((prev) => ({
                      ...prev,
                      infrastructure: {
                        ...prev.infrastructure,
                        googleAdsCustomerId: e.target.value,
                      },
                    }))
                  }
                />
              </label>
            </div>

            <div className="kxd-launch-wizard__provider-list">
              {(
                [
                  ["searchConsoleIntention", "Search Console"],
                  ["ga4Intention", "GA4"],
                  ["googleAdsIntention", "Google Ads"],
                ] as const
              ).map(([key, label]) => {
                const intention =
                  payload.infrastructure[key] === "connected"
                    ? "needs-authorization"
                    : payload.infrastructure[key];
                return (
                  <div
                    key={key}
                    className="kxd-launch-wizard__provider-row"
                    data-state={intention}
                  >
                    <div className="kxd-launch-wizard__provider-copy">
                      <strong>{label}</strong>
                      <span className="kxd-launch-wizard__provider-state">
                        {stateLabel(intention)}
                      </span>
                    </div>
                    <select
                      value={intention}
                      onChange={(e) =>
                        updatePayload((prev) => ({
                          ...prev,
                          infrastructure: {
                            ...prev.infrastructure,
                            [key]: e.target
                              .value as LaunchWizardDraftPayload["infrastructure"][typeof key],
                          },
                        }))
                      }
                      aria-label={`${label} status`}
                    >
                      {INTENTION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <label className="kxd-launch-wizard__check">
              <input
                type="checkbox"
                checked={payload.infrastructure.portalReady}
                onChange={(e) =>
                  updatePayload((prev) => ({
                    ...prev,
                    infrastructure: {
                      ...prev.infrastructure,
                      portalReady: e.target.checked,
                    },
                  }))
                }
              />
              Prepare portal workspace on launch
            </label>
          </div>
        ) : null}

        {step === "team" ? (
          <div className="kxd-launch-wizard__fields">
            <header className="kxd-launch-wizard__step-head">
              <h2>{stepCopy.title}</h2>
              <p className="kxd-launch-wizard__hint">{stepCopy.lead}</p>
            </header>
            {payload.team.length === 0 ? (
              <div className="kxd-launch-wizard__empty-state">
                <p>No portal users yet</p>
                <p className="kxd-launch-wizard__hint">
                  Add the people who should receive portal access. Records can be
                  created at launch; email invitations are not sent in this phase.
                </p>
              </div>
            ) : (
              payload.team.map((member, index) => (
                <div key={member.id} className="kxd-launch-wizard__team-card">
                  <div className="kxd-launch-wizard__team-row">
                    <label className="kxd-launch-wizard__field">
                      Name
                      <input
                        value={member.name}
                        onChange={(e) =>
                          updatePayload((prev) => ({
                            ...prev,
                            team: prev.team.map((row, i) =>
                              i === index ? { ...row, name: e.target.value } : row,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label className="kxd-launch-wizard__field">
                      Email
                      <input
                        value={member.email}
                        onChange={(e) =>
                          updatePayload((prev) => ({
                            ...prev,
                            team: prev.team.map((row, i) =>
                              i === index ? { ...row, email: e.target.value } : row,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label className="kxd-launch-wizard__field">
                      Role
                      <select
                        value={member.role}
                        onChange={(e) =>
                          updatePayload((prev) => ({
                            ...prev,
                            team: prev.team.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    role: e.target
                                      .value as LaunchWizardTeamMember["role"],
                                  }
                                : row,
                            ),
                          }))
                        }
                      >
                        <option value="owner">Owner</option>
                        <option value="collaborator">Collaborator</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </label>
                  </div>
                  <div className="kxd-launch-wizard__team-flags">
                    <label className="kxd-launch-wizard__check">
                      <input
                        type="checkbox"
                        checked={member.isPrimaryContact}
                        onChange={(e) =>
                          updatePayload((prev) => ({
                            ...prev,
                            team: prev.team.map((row, i) => ({
                              ...row,
                              isPrimaryContact:
                                i === index ? e.target.checked : false,
                            })),
                          }))
                        }
                      />
                      Primary contact
                    </label>
                    <label className="kxd-launch-wizard__check">
                      <input
                        type="checkbox"
                        checked={member.inviteOnLaunch}
                        onChange={(e) =>
                          updatePayload((prev) => ({
                            ...prev,
                            team: prev.team.map((row, i) =>
                              i === index
                                ? { ...row, inviteOnLaunch: e.target.checked }
                                : row,
                            ),
                          }))
                        }
                      />
                      Create user on launch
                    </label>
                    <span
                      className="kxd-launch-wizard__invite-note"
                      data-state={member.inviteOnLaunch ? "record" : "draft"}
                    >
                      {member.inviteOnLaunch
                        ? "Access at launch · email not sent"
                        : "Draft only"}
                    </span>
                    <button
                      type="button"
                      className="kxd-launch-wizard__text-btn"
                      onClick={() => removeTeamMember(member.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
            <button
              type="button"
              className="kxd-launch-wizard__secondary"
              onClick={addTeamMember}
            >
              Add portal access
            </button>
          </div>
        ) : null}

        {step === "automation" ? (
          <div className="kxd-launch-wizard__fields">
            <header className="kxd-launch-wizard__step-head">
              <h2>{stepCopy.title}</h2>
              <p className="kxd-launch-wizard__hint">{stepCopy.lead}</p>
            </header>
            <div className="kxd-launch-wizard__automation-board">
              <label className="kxd-launch-wizard__check kxd-launch-wizard__check--inline">
                <input
                  type="checkbox"
                  checked={payload.automation.reportingAutomationEnabled}
                  onChange={(e) =>
                    updatePayload((prev) => ({
                      ...prev,
                      automation: {
                        ...prev.automation,
                        reportingAutomationEnabled: e.target.checked,
                      },
                    }))
                  }
                />
                <span>
                  Reporting automation
                  <em>
                    {payload.automation.reportingAutomationEnabled
                      ? "Runs after launch"
                      : "Off until enabled"}
                  </em>
                </span>
              </label>
              <div className="kxd-launch-wizard__schedule-block">
                <label className="kxd-launch-wizard__field">
                  Sync hour
                  <input
                    type="number"
                    min={0}
                    max={23}
                    step={1}
                    value={payload.automation.syncHourPacific}
                    onChange={(e) =>
                      updatePayload((prev) => ({
                        ...prev,
                        automation: {
                          ...prev.automation,
                          syncHourPacific: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
                <p className="kxd-launch-wizard__schedule">
                  <strong>{formatHour(payload.automation.syncHourPacific)}</strong>
                  <span>Pacific · America/Los_Angeles</span>
                </p>
              </div>
            </div>
            <div className="kxd-launch-wizard__provider-toggles">
              <p className="kxd-launch-wizard__section-label">Entitled providers</p>
              {(["search-console", "ga4", "ads"] as const).map((provider) => (
                <label key={provider} className="kxd-launch-wizard__check">
                  <input
                    type="checkbox"
                    checked={payload.automation.entitledProviders.includes(
                      provider,
                    )}
                    onChange={(e) =>
                      updatePayload((prev) => {
                        const set = new Set(prev.automation.entitledProviders);
                        if (e.target.checked) set.add(provider);
                        else set.delete(provider);
                        return {
                          ...prev,
                          automation: {
                            ...prev.automation,
                            entitledProviders: Array.from(set) as Array<
                              "search-console" | "ga4" | "ads"
                            >,
                          },
                        };
                      })
                    }
                  />
                  {provider === "search-console"
                    ? "Search Console"
                    : provider === "ga4"
                      ? "GA4"
                      : "Google Ads"}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {step === "review" || step === "launch" ? (
          <div className="kxd-launch-wizard__review">
            <header className="kxd-launch-wizard__step-head">
              <h2>{stepCopy.title}</h2>
              {readiness.canLaunch ? (
                <p className="kxd-launch-wizard__confidence">
                  Everything required to launch this client is ready.
                </p>
              ) : (
                <p className="kxd-launch-wizard__hint">{stepCopy.lead}</p>
              )}
            </header>

            {readinessGroups.blocked.length ? (
              <section
                className="kxd-launch-wizard__review-section"
                data-section="blocked"
              >
                <h3>Blocked</h3>
                <ul className="kxd-launch-wizard__plain-list">
                  {readinessGroups.blocked.map((category) => (
                    <li key={category.id}>
                      <strong>{category.label}</strong>
                      <span>{category.summary}</span>
                      {category.resolveStepId ? (
                        <button
                          type="button"
                          className="kxd-launch-wizard__text-btn"
                          onClick={() => navigateToStep(category.resolveStepId!)}
                        >
                          Go to {category.label}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="kxd-launch-wizard__review-section" data-section="client">
              <h3>Client</h3>
              <dl className="kxd-launch-wizard__review-dl">
                <div>
                  <dt>Business</dt>
                  <dd>{payload.identity.businessName.trim() || "Untitled"}</dd>
                </div>
                <div>
                  <dt>Package</dt>
                  <dd>{selectedPackage?.catalogLabel ?? "—"}</dd>
                </div>
                <div>
                  <dt>Experience</dt>
                  <dd>{payload.experience.choiceId || "—"}</dd>
                </div>
                <div>
                  <dt>Automation</dt>
                  <dd>
                    {payload.automation.reportingAutomationEnabled
                      ? formatHour(payload.automation.syncHourPacific)
                      : "Off"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="kxd-launch-wizard__review-section" data-section="includes">
              <h3>Workspace includes</h3>
              <ul className="kxd-launch-wizard__plain-list">
                {capabilityPreview
                  .filter(
                    (row) =>
                      row.state === "included" || row.state === "optional",
                  )
                  .map((row) => (
                    <li key={row.areaId}>
                      <strong>{row.label}</strong>
                      <span>
                        {stateLabel(row.state)}
                        {row.detail ? ` · ${row.detail}` : ""}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>

            {(readiness.postLaunchFollowUps.length > 0 ||
              readinessGroups.awaiting.length > 0) && (
              <section
                className="kxd-launch-wizard__review-section"
                data-section="followups"
              >
                <h3>Still to complete</h3>
                <ul className="kxd-launch-wizard__plain-list">
                  {readinessGroups.awaiting.map((category) => (
                    <li key={category.id}>
                      <strong>{category.label}</strong>
                      <span>{category.summary}</span>
                      {category.resolveStepId ? (
                        <button
                          type="button"
                          className="kxd-launch-wizard__text-btn"
                          onClick={() => navigateToStep(category.resolveStepId!)}
                        >
                          Go to {category.label}
                        </button>
                      ) : null}
                    </li>
                  ))}
                  {readiness.postLaunchFollowUps.map((item) => (
                    <li key={item}>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {readinessGroups.optional.length ? (
              <section
                className="kxd-launch-wizard__review-section"
                data-section="optional"
              >
                <h3>Optional</h3>
                <ul className="kxd-launch-wizard__plain-list">
                  {readinessGroups.optional.map((category) => (
                    <li key={category.id}>
                      <strong>{category.label}</strong>
                      <span>{category.summary}</span>
                    </li>
                  ))}
                  {readiness.optionalEnhancements.map((item) => (
                    <li key={item}>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="kxd-launch-wizard__review-section" data-section="create">
              <h3>KXD OS will create</h3>
              <ul className="kxd-launch-wizard__plain-list">
                {readiness.willCreate.map((item) => (
                  <li key={item}>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </section>

      <footer className="kxd-launch-wizard__footer">
        <button
          type="button"
          className="kxd-launch-wizard__ghost"
          onClick={goBack}
          disabled={pending || !prevStepId(step)}
        >
          Back
        </button>
        <button
          type="button"
          className="kxd-launch-wizard__ghost"
          onClick={saveOnly}
          disabled={pending || saveState === "saving"}
        >
          {saveState === "saving" ? "Saving…" : "Save draft"}
        </button>
        {step === "review" || step === "launch" ? (
          <button
            type="button"
            className="kxd-launch-wizard__primary"
            onClick={openLaunchConfirm}
            disabled={pending || !readiness.canLaunch || launchSubmitting}
          >
            Launch Client
          </button>
        ) : (
          <button
            type="button"
            className="kxd-launch-wizard__primary"
            onClick={goNext}
            disabled={pending || saveState === "saving"}
          >
            {pending || saveState === "saving" ? "Saving…" : "Continue"}
          </button>
        )}
      </footer>

      {confirmOpen ? (
        <div
          className="kxd-launch-wizard__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="launch-confirm-title"
        >
          <div className="kxd-launch-wizard__confirm">
            <h2 id="launch-confirm-title">
              Launch {confirmation.businessName}
            </h2>
            <p className="kxd-launch-wizard__hint">
              Package {confirmation.packageLabel}. This creates Shared Core
              records for the client.
            </p>
            <dl className="kxd-launch-wizard__confirm-grid">
              <div>
                <dt>Portal users</dt>
                <dd>{confirmation.portalUsersToCreate}</dd>
              </div>
              <div>
                <dt>Invitations</dt>
                <dd>{confirmation.invitationStatusLabel}</dd>
              </div>
              <div>
                <dt>Modules</dt>
                <dd>
                  {confirmation.modulesEnabled.length
                    ? confirmation.modulesEnabled.join(", ")
                    : "None"}
                </dd>
              </div>
              <div>
                <dt>Automation</dt>
                <dd>
                  {confirmation.automationEnabled
                    ? confirmation.syncHourLabel
                      ? confirmation.syncHourLabel
                      : "Enabled"
                    : "Off"}
                </dd>
              </div>
              <div>
                <dt>Awaiting authorization</dt>
                <dd>
                  {confirmation.integrationsAwaitingAuthorization.length
                    ? confirmation.integrationsAwaitingAuthorization.join(", ")
                    : "None"}
                </dd>
              </div>
            </dl>
            <div className="kxd-launch-wizard__confirm-creates">
              <h3>Creates</h3>
              <ul>
                {confirmation.createsRecords.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="kxd-launch-wizard__confirm-actions">
              <button
                type="button"
                className="kxd-launch-wizard__ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={pending || launchSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kxd-launch-wizard__primary"
                onClick={executeLaunch}
                disabled={pending || launchSubmitting}
              >
                {launchSubmitting ? "Launching…" : "Confirm Launch Client"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
