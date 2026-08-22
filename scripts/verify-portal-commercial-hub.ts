/**
 * Verify portal commercial hub — billingPlan precedence, de Bois fixture, nav wiring.
 * Read-only against Payload; does not launch clients or mutate commercial records.
 *
 * Run:
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/verify-portal-commercial-hub.ts
 */
const DE_BOIS_CLIENT_ID = 19;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function parseCents(label: string): number {
  const normalized = label.replace(/[^0-9.]/g, "");
  return Math.round(Number.parseFloat(normalized) * 100);
}

async function main() {
  const config = (await import("@payload-config")).default;
  const { getPayload } = await import("payload");
  const { loadPortalCommercialForClient, verifyPortalCommercialDocumentAccess } =
    await import("../lib/portal/commercial/load");
  const { loadActiveEngagementForClient } = await import(
    "../lib/portal/active-engagement/load"
  );
  const { getEnabledPortalNavGroups } = await import("../lib/portal/nav");
  const { buildDefaultCesProfileData } = await import("../lib/client-launch/defaults");
  const { normalizeCesExperienceModuleList } = await import("../lib/ces/modules/canonical");
  const { launchDraftLinkedClientId } = await import(
    "../lib/client-launch-wizard/draft/linked-client"
  );
  type ResolvedExperienceProfile = import("../lib/ces/types").ResolvedExperienceProfile;

  const payload = await getPayload({ config });

  const client = await payload.findByID({
    collection: "clients",
    id: DE_BOIS_CLIENT_ID,
    depth: 0,
    overrideAccess: true,
  });

  assert(
    String(client.status ?? "") === "prospect",
    `Client ${DE_BOIS_CLIENT_ID} must remain prospect (not launched).`,
  );

  const draftResult = await payload.find({
    collection: "client-launch-drafts" as never,
    where: { status: { in: ["draft", "ready"] } },
    limit: 50,
    sort: "-updatedAt",
    depth: 0,
    overrideAccess: true,
  });
  const linkedDraft = (draftResult.docs as Record<string, unknown>[]).find(
    (doc) => launchDraftLinkedClientId(doc) === DE_BOIS_CLIENT_ID,
  );
  assert(Boolean(linkedDraft), "Launch draft must link to Client 19.");
  const draftModules = (
    (linkedDraft?.payload as { modules?: Array<{ moduleId?: string; selected?: boolean }> })?.modules ??
    []
  )
    .filter((row) => row.selected && row.moduleId)
    .map((row) => row.moduleId as string);
  assert(
    draftModules.includes("website-review"),
    "Launch draft must include website-review for de Bois.",
  );
  const inferredModules = normalizeCesExperienceModuleList(draftModules);

  const commercial = await loadPortalCommercialForClient(DE_BOIS_CLIENT_ID, {
    enabledPortalModules: inferredModules,
  });
  if (commercial.kind !== "ready") {
    throw new Error(`de Bois commercial view must be ready — got ${commercial.kind}`);
  }
  const ready = commercial;

  assert(
    ready.engagement.title.toLowerCase().includes("de bois") ||
      ready.engagement.title.toLowerCase().includes("website"),
    `Unexpected engagement title: ${ready.engagement.title}`,
  );
  assert(ready.engagement.statusLabel === "Active", "Engagement status should present as Active.");
  assert(
    parseCents(ready.payments.totalLabel) === 950000,
    `Total should be $9,500 — got ${ready.payments.totalLabel}`,
  );
  assert(
    parseCents(ready.payments.paidLabel) === 250000,
    `Paid should be $2,500 — got ${ready.payments.paidLabel}`,
  );
  assert(
    parseCents(ready.payments.remainingLabel) === 700000,
    `Remaining should be $7,000 — got ${ready.payments.remainingLabel}`,
  );

  const scheduleAmounts = ready.payments.schedule.map((row) => parseCents(row.amountLabel));
  assert(
    scheduleAmounts.join(",") === "250000,200000,200000,300000",
    `Schedule amounts wrong: ${scheduleAmounts.join(",")}`,
  );
  assert(
    ready.payments.schedule[0].statusLabel === "Paid",
    "Initial deposit should be Paid.",
  );
  assert(
    !ready.payments.schedule.some(
      (row) => row.label.includes("4,750") || row.amountLabel.includes("4,750"),
    ),
    "Superseded proposal payment schedule must not appear as active billing.",
  );

  assert(ready.agreement.statusLabel === "Signed", "Agreement should present as Signed.");
  assert(Boolean(ready.agreement.clientSignerName), "Client signer required.");
  assert(Boolean(ready.agreement.kxdSignerName), "KXD signer required.");

  const executedDoc = ready.documents.find((d) => d.kindLabel === "Agreement");
  assert(executedDoc, "Executed agreement document required.");
  const certDoc = ready.documents.find((d) => d.kindLabel === "Execution certificate");
  assert(certDoc, "Execution certificate document required.");

  const wrongClientAccess = await verifyPortalCommercialDocumentAccess({
    documentId: executedDoc.id,
    clientId: DE_BOIS_CLIENT_ID + 1,
  });
  assert(!wrongClientAccess.ok, "Cross-client document access must fail.");

  const ownAccess = await verifyPortalCommercialDocumentAccess({
    documentId: executedDoc.id,
    clientId: DE_BOIS_CLIENT_ID,
  });
  assert(ownAccess.ok, "Authorized client document access must succeed.");

  const engagement = await loadActiveEngagementForClient(DE_BOIS_CLIENT_ID);
  assert(engagement.available, "Active engagement card should be available.");
  assert(
    engagement.totalValueLabel === ready.payments.totalLabel,
    "Home engagement total must match.",
  );
  assert(engagement.agreementHref === "/portal/agreement", "Home should link to agreement.");

  const cesDefaults = buildDefaultCesProfileData({
    clientName: "de Bois Entertainment",
    clientSlug: String(client.slug ?? ""),
    enabledModules: normalizeCesExperienceModuleList(inferredModules),
  });
  const profile: ResolvedExperienceProfile = {
    profileId: null,
    source: "profile",
    identity: {
      clientId: DE_BOIS_CLIENT_ID,
      clientName: String(client.name ?? "de Bois"),
      clientSlug: String(client.slug ?? ""),
      logoUrl: null,
      logoAlt: String(client.name ?? "de Bois"),
      websiteUrl: null,
    },
    visual: {
      primaryColor: cesDefaults.primaryColor,
      secondaryColor: cesDefaults.secondaryColor,
      accentColor: cesDefaults.accentColor,
      surfaceTint: cesDefaults.surfaceTint,
      borderRadiusPreset: cesDefaults.borderRadiusPreset,
      motionPreset: cesDefaults.motionPreset,
    },
    hospitality: {
      welcomeEyebrow: cesDefaults.welcomeEyebrow,
      welcomeGreeting: cesDefaults.welcomeGreeting,
      welcomeLead: cesDefaults.welcomeLead,
    },
    terminology: cesDefaults.terminology,
    enabledModules: normalizeCesExperienceModuleList(inferredModules),
    enabledPortalModules: inferredModules,
    reportingCapabilities: [],
    planKey: null,
    planStatus: "legacy",
  };

  const nav = getEnabledPortalNavGroups(profile, {
    commercialNavAvailable: true,
    billingNavAvailable: false,
  });
  const workItems = nav.find((g) => g.label === "Work")?.items ?? [];
  assert(
    workItems.some((item) => item.id === "website-review"),
    "Website Review nav must remain visible in operator preview.",
  );
  assert(
    workItems.some((item) => item.id === "agreement"),
    "Agreement nav must appear when commercial is available.",
  );

  console.log("verify-portal-commercial-hub: OK");
  console.log(
    JSON.stringify(
      {
        clientId: DE_BOIS_CLIENT_ID,
        clientStatus: client.status,
        engagement: ready.engagement,
        payments: ready.payments,
        agreement: ready.agreement,
        scheduleLabels: ready.payments.schedule.map((r) => ({
          label: r.label,
          amount: r.amountLabel,
          status: r.statusLabel,
        })),
        documents: ready.documents.map((d) => d.title),
        collaboration: ready.collaboration,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("verify-portal-commercial-hub: FAILED");
  console.error(err);
  process.exit(1);
});
