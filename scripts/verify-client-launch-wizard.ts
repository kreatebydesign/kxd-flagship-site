/**
 * Phase 34A / 34A.1 — Client Launch Pipeline verification.
 *
 *   npm run verify:client-launch-wizard
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertNoInvitationsFromDraft,
  assertNoSecretsInDraftJson,
  buildAdminClientWorkspaceUrl,
  buildLaunchConfirmationSummary,
  buildLaunchStages,
  buildLaunchStepProgress,
  buildPackageCapabilityPreview,
  canNavigateToStep,
  computeLaunchReadiness,
  emptyLaunchWizardPayload,
  errorsOnly,
  getLaunchPackagePreset,
  groupModulesByCategory,
  launchModuleLabel,
  listLaunchExperienceOptions,
  listLaunchPackagePresets,
  moduleAvailabilityForPackage,
  normalizeClientSlug,
  normalizeLaunchWizardPayload,
  packageCapabilitySummaryLines,
  persistableEntitlementIds,
  rejectUnknownLaunchModules,
  resolvePackageModuleSelections,
  sanitizeLaunchFailureMessage,
  selectedModuleIds,
  validateAutomationStep,
  validateIdentityStep,
  validateLaunchReadiness,
  validateModulesStep,
  validateTeamStep,
} from "../lib/client-launch-wizard";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function check(label: string, condition: boolean) {
  if (!condition) {
    console.error(`  ✗ ${label}`);
    throw new Error(label);
  }
  console.log(`  ✔ ${label}`);
}

function fixtureClient(name: string, packageId: "starter" | "growth" | "custom") {
  const payload = emptyLaunchWizardPayload();
  payload.identity = {
    businessName: name,
    clientSlug: normalizeClientSlug(name),
    primaryContactName: "Alex Founder",
    primaryContactEmail: `alex@${normalizeClientSlug(name)}.example`,
    phone: "555-0100",
    companyWebsite: `https://${normalizeClientSlug(name)}.example`,
    industry: "Motorsports",
    serviceRegion: "Oregon",
    internalNotes: "",
  };
  payload.package.packageId = packageId;
  payload.modules = resolvePackageModuleSelections(packageId);
  if (packageId === "custom") {
    payload.modules = payload.modules.map((row) =>
      row.moduleId === "website-review" ? { ...row, selected: true } : row,
    );
  }
  const preset = getLaunchPackagePreset(packageId);
  if (preset) {
    payload.automation = {
      ...payload.automation,
      ...preset.automationDefaults,
    };
  }
  payload.experience.choiceId = "default";
  payload.team = [
    {
      id: "1",
      name: "Alex Founder",
      email: `alex@${normalizeClientSlug(name)}.example`,
      role: "owner",
      isPrimaryContact: true,
      inviteOnLaunch: true,
    },
  ];
  return payload;
}

function main() {
  console.log("\nPhase 34A.1 — verify:client-launch-wizard\n");

  const shell = readFileSync(
    path.join(
      root,
      "components/admin/operations/client-launch-wizard/ClientLaunchWizardShell.tsx",
    ),
    "utf8",
  );
  const landing = readFileSync(
    path.join(root, "app/admin/operations/clients/launch/page.tsx"),
    "utf8",
  );
  const legacy = readFileSync(
    path.join(root, "app/admin/operations/client-launch/page.tsx"),
    "utf8",
  );
  const nav = readFileSync(
    path.join(root, "components/admin/operations/shared/operations-nav.ts"),
    "utf8",
  );
  const server = readFileSync(
    path.join(root, "lib/client-launch-wizard/server.ts"),
    "utf8",
  );
  const orch = readFileSync(
    path.join(root, "lib/client-launch-wizard/launch/orchestrate.ts"),
    "utf8",
  );
  const draftApi = readFileSync(
    path.join(
      root,
      "app/api/admin/client-launch-wizard/drafts/[draftId]/route.ts",
    ),
    "utf8",
  );

  check(
    "opening landing uses draft inbox (no immediate auto-create)",
    landing.includes("LaunchDraftInbox") &&
      landing.includes("Start new client") &&
      !landing.includes("createLaunchDraft"),
  );

  check(
    "new draft route exists for explicit create",
    readFileSync(
      path.join(root, "app/admin/operations/clients/launch/new/page.tsx"),
      "utf8",
    ).includes("createLaunchDraft"),
  );

  check(
    "shell uses expectedUpdatedAt conflict protection",
    shell.includes("expectedUpdatedAt") && server.includes("expectedUpdatedAt"),
  );

  check(
    "stale draft conflict returns 409 path",
    server.includes("This draft changed elsewhere"),
  );

  check(
    "shell tracks unsaved/saving/saved states and beforeunload",
    shell.includes('SaveState = "idle" | "unsaved" | "saving" | "saved" | "error"') &&
      shell.includes("beforeunload"),
  );

  check(
    "slug suggestion helper preserves manual edit path",
    shell.includes("slugManuallyEdited") && shell.includes("Reset slug"),
  );

  check(
    "slug uniqueness API route exists",
    readFileSync(
      path.join(root, "app/api/admin/client-launch-wizard/slug/route.ts"),
      "utf8",
    ).includes("checkSlugAvailability"),
  );

  check(
    "package capability preview is derived from preset helpers",
    shell.includes("buildPackageCapabilityPreview") &&
      !shell.includes("Most popular"),
  );

  check(
    "no UI-side duplicated package catalog rules",
    !shell.includes("Website collaboration foundation") &&
      shell.includes("listLaunchPackagePresets"),
  );

  check(
    "experience options expose real presentation flags",
    listLaunchExperienceOptions().some((o) => o.choiceId === "default") &&
      listLaunchExperienceOptions().every((o) => "epEnabled" in o),
  );

  check(
    "modules are grouped by practical category",
    groupModulesByCategory(resolvePackageModuleSelections("premium")).length >= 2 &&
      launchModuleLabel("website-review") === "Website Review",
  );

  check(
    "package-included vs optional distinction",
    moduleAvailabilityForPackage("growth", "website-review") === "included" &&
      moduleAvailabilityForPackage("growth", "executive-reporting") === "optional",
  );

  check(
    "infrastructure rejects connected claims",
    errorsOnly(
      validateLaunchReadiness({
        ...fixtureClient("Conn Co", "starter"),
        infrastructure: {
          ...fixtureClient("Conn Co", "starter").infrastructure,
          searchConsoleIntention: "connected",
        },
      }),
    ).some((issue) => issue.code === "infrastructure.connected.claim"),
  );

  check(
    "team invitation honesty in confirmation",
    buildLaunchConfirmationSummary(fixtureClient("Invite Co", "starter"))
      .invitationsWillBeSent === false,
  );

  check(
    "existing portal email collision validated",
    validateTeamStep(fixtureClient("Portal Co", "starter").team, {
      existingPortalEmails: [`alex@${normalizeClientSlug("Portal Co")}.example`],
    }).some((issue) => issue.code === "team.email.exists"),
  );

  check(
    "shell does not claim invitation delivered",
    !shell.toLowerCase().includes("invitation sent") &&
      !shell.toLowerCase().includes("email delivered"),
  );

  check(
    "sync hour strict validation",
    validateAutomationStep({
      reportingAutomationEnabled: true,
      syncHourPacific: 24,
      entitledProviders: ["ga4"],
      executiveBriefingPreferred: false,
    }).some((issue) => issue.code === "automation.syncHour.invalid"),
  );

  const ready = fixtureClient("Ready Co", "growth");
  const readiness = computeLaunchReadiness(ready);
  check("review separates blockers and follow-ups", readiness.blockers.length === 0);
  check(
    "unknown never displayed as ready (connected blocked)",
    readiness.categories.every((c) => c.state !== ("unknown" as string)),
  );
  check(
    "step-resolution links present on readiness categories",
    readiness.categories.every((c) => Boolean(c.resolveStepId)),
  );

  const progress = buildLaunchStepProgress({
    currentStep: "package",
    payload: {
      ...ready,
      identity: { ...ready.identity, businessName: "", clientSlug: "" },
    },
  });
  check(
    "progress marks incomplete prior steps blocked",
    progress.find((s) => s.id === "identity")?.state === "blocked",
  );

  check(
    "direct navigation cannot silently bypass identity",
    canNavigateToStep("package", {
      ...ready,
      identity: { ...ready.identity, businessName: "" },
    }).ok === false,
  );

  const confirmation = buildLaunchConfirmationSummary(ready);
  check(
    "explicit launch confirmation summary includes business + package + users",
    confirmation.businessName.includes("Ready") &&
      confirmation.packageLabel === "Growth" &&
      confirmation.portalUsersToCreate === 1,
  );

  check(
    "shell requires confirmation modal before launch",
    shell.includes("buildLaunchConfirmationSummary") &&
      shell.includes("kxd-launch-wizard__confirm"),
  );

  check(
    "double-launch prevention remains server-side",
    server.includes("already launched") && server.includes("launching"),
  );

  check(
    "launch stage recovery poll present",
    shell.includes("LAUNCH_POLL_MS") && shell.includes('status === "launching"'),
  );

  check(
    "sanitized launch failures used in API",
    draftApi.includes("sanitizeLaunchFailureMessage"),
  );

  check(
    "durable launch result (no auto redirect-only success)",
    shell.includes("Open Client Workspace") &&
      !shell.includes('router.push("/admin/operations/clients")'),
  );

  check(
    "complete URLs helpers remain absolute",
    buildAdminClientWorkspaceUrl(9, {
      envOrigin: "https://portal.kreatebydesign.com",
    }) === "https://portal.kreatebydesign.com/admin/operations/clients/9",
  );

  check(
    "legacy wizard not equally prominent in nav",
    nav.includes('href: "/admin/operations/clients/launch"') &&
      !nav.includes('href: "/admin/operations/client-launch"'),
  );

  check(
    "legacy route marked and links to pipeline",
    legacy.includes("Legacy wizard") &&
      legacy.includes("/admin/operations/clients/launch"),
  );

  check(
    "abandon path marks draft abandoned without relaunch",
    server.includes("abandonLaunchDraft") &&
      server.includes('status: "abandoned"') &&
      !server
        .slice(server.indexOf("abandonLaunchDraft"))
        .includes("orchestrateClientLaunch("),
  );

  check(
    "launched drafts cannot relaunch",
    server.includes("This draft was already launched"),
  );

  check(
    "package presets include all catalog IDs",
    listLaunchPackagePresets()
      .map((p) => p.id)
      .join(",") === "starter,growth,premium,enterprise,custom",
  );

  check(
    "capability preview comes from Shared Core, not fabricated Connected",
    buildPackageCapabilityPreview("growth").every(
      (row) => row.state !== ("connected" as string),
    ) &&
      packageCapabilitySummaryLines("growth").some((line) =>
        line.includes("Reporting"),
      ),
  );

  for (const [label, draft] of [
    ["starter", fixtureClient("Starter Garage", "starter")],
    ["growth", fixtureClient("Growth Racing", "growth")],
    [
      "custom",
      (() => {
        const d = fixtureClient("Custom Works", "custom");
        return d;
      })(),
    ],
  ] as const) {
    check(`${label} fixture canLaunch`, computeLaunchReadiness(draft).canLaunch);
  }

  check(
    "reject unknown modules",
    rejectUnknownLaunchModules(["website-review", "made-up"]).length === 1,
  );

  check(
    "coming-soon not persistable",
    !persistableEntitlementIds([
      { moduleId: "gbp", selected: true, source: "optional" },
    ]).includes("gbp"),
  );

  check(
    "executive-reporting dependency validates",
    validateModulesStep("custom", [
      {
        moduleId: "executive-reporting",
        selected: true,
        source: "custom-override",
      },
    ]).some((issue) => issue.code === "modules.dependency.executiveReporting"),
  );

  check(
    "slug normalization is URL-safe",
    normalizeClientSlug("Primal Motorsports") === "primal-motorsports",
  );

  check(
    "identity existing slug errors",
    validateIdentityStep(fixtureClient("Acme", "starter").identity, {
      slugTakenByClient: true,
    }).some((issue) => issue.code === "identity.clientSlug.exists"),
  );

  check(
    "duplicate portal emails rejected in draft",
    validateTeamStep([
      {
        id: "1",
        name: "A",
        email: "a@example.com",
        role: "owner",
        isPrimaryContact: true,
        inviteOnLaunch: true,
      },
      {
        id: "2",
        name: "B",
        email: "a@example.com",
        role: "collaborator",
        isPrimaryContact: false,
        inviteOnLaunch: false,
      },
    ]).some((issue) => issue.code === "team.email.duplicate"),
  );

  check(
    "no invitations while draft",
    assertNoInvitationsFromDraft("draft"),
  );

  check(
    "sanitize strips bearer + secrets scan",
    !sanitizeLaunchFailureMessage("failed Bearer abc.def").includes("abc.def") &&
      assertNoSecretsInDraftJson({ apiKey: "x" }).length === 1,
  );

  check("launch orchestration is server-only", orch.includes('import "server-only"'));
  check(
    "no provider ingest in launch",
    !orch.includes("ingestReporting") && !orch.includes("runReportingSweep"),
  );
  check(
    "no client-specific forks in orchestrator/presets",
    !orch.toLowerCase().includes("primal") &&
      !readFileSync(
        path.join(root, "lib/client-launch-wizard/packages/presets.ts"),
        "utf8",
      )
        .toLowerCase()
        .includes("primal"),
  );

  check(
    "UI does not perform multi-collection writes",
    !shell.includes("payload.create") && !shell.includes("getPayload"),
  );

  check(
    "launch stages are deterministic (no fake percentages)",
    buildLaunchStages({ phase: "running", activeStageId: "creating-client" }).some(
      (s) => s.state === "active",
    ) && !shell.includes("% complete"),
  );

  check(
    "normalize draft payload remains safe",
    normalizeLaunchWizardPayload({ identity: { businessName: "X" } }).identity
      .businessName === "X",
  );

  check(
    "selected growth modules include website-review",
    selectedModuleIds(fixtureClient("G", "growth").modules).includes(
      "website-review",
    ),
  );

  console.log("\nPhase 34A.1 verification passed.\n");
}

main();
