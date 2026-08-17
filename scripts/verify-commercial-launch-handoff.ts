/**
 * Commercial → Client Launch Handoff V0 — deterministic verification.
 *
 *   npm run verify:commercial-launch-handoff
 *
 * No production writes. No real emails. Logic + source-contract checks only.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HANDOFF_DEFERRED_MODULES,
  HANDOFF_READY_CES_MODULES,
  filterToHandoffReadyModules,
  isHandoffReadyModule,
} from "../lib/commercial-launch-handoff/ready-modules";
import {
  isModernCommercialProposal,
  LEGACY_CHECKOUT_BLOCKED_MESSAGE,
} from "../lib/commercial-launch-handoff/legacy-guard";
import { mapLaunchRoleToMembershipRole } from "../lib/commercial-launch-handoff/invite-roles";
import {
  buildLaunchConfirmationSummary,
  normalizeLaunchWizardPayload,
} from "../lib/client-launch-wizard";
import { PORTAL_CLIENT_LANGUAGE } from "../lib/ces/copy/portal-language";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function check(label: string, condition: boolean) {
  if (!condition) {
    console.error(`  ✗ ${label}`);
    throw new Error(label);
  }
  console.log(`  ✔ ${label}`);
}

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function main() {
  console.log("\nCommercial → Client Launch Handoff V0\n");

  check(
    "ready modules are website-review only by default",
    HANDOFF_READY_CES_MODULES.length === 1 &&
      HANDOFF_READY_CES_MODULES[0] === "website-review",
  );
  check("inventory is deferred for handoff defaults", HANDOFF_DEFERRED_MODULES.includes("inventory"));
  check(
    "filter strips deferred modules",
    filterToHandoffReadyModules(["website-review", "inventory", "reports"]).join(",") ===
      "website-review",
  );
  check("isHandoffReadyModule rejects inventory", !isHandoffReadyModule("inventory"));

  check(
    "launch role owner → client-owner",
    mapLaunchRoleToMembershipRole("owner") === "client-owner",
  );
  check(
    "launch role collaborator → client-admin",
    mapLaunchRoleToMembershipRole("collaborator") === "client-admin",
  );
  check(
    "launch role viewer → client-member",
    mapLaunchRoleToMembershipRole("viewer") === "client-member",
  );

  check(
    "modern proposal detected via builderDocument",
    isModernCommercialProposal({ builderDocument: { version: 1 } }),
  );
  check(
    "modern proposal detected via acceptedSnapshot",
    isModernCommercialProposal({ acceptedSnapshot: { id: 1 } }),
  );
  check(
    "legacy proposal without builder remains unblocked by heuristic",
    !isModernCommercialProposal({ status: "sent", title: "Old deal" }),
  );
  check(
    "legacy checkout block message is explicit",
    LEGACY_CHECKOUT_BLOCKED_MESSAGE.toLowerCase().includes("modern"),
  );

  const handoffPayload = normalizeLaunchWizardPayload({
    identity: {
      businessName: "Handoff Co",
      clientSlug: "handoff-co",
      primaryContactName: "Pat",
      primaryContactEmail: "pat@handoff.example",
    },
    package: {
      packageId: "starter",
      displayName: "Website",
      commercialAgreementId: "custom-legacy",
      monthlyStarting: 1500,
      setupFee: 2500,
      monthlyServiceCredits: null,
      approvedAddOnIds: [],
      commercialNotes: "contract #99",
    },
    modules: [{ moduleId: "website-review", selected: true, source: "package-default" }],
    team: [
      {
        id: "1",
        name: "Pat",
        email: "pat@handoff.example",
        role: "owner",
        isPrimaryContact: true,
        inviteOnLaunch: true,
      },
    ],
    commercialHandoff: {
      contractId: 99,
      proposalId: 12,
      sourceClientId: 7,
      reuseExistingClient: true,
    },
  });

  check(
    "commercialHandoff survives payload normalize",
    handoffPayload.commercialHandoff?.contractId === 99 &&
      handoffPayload.commercialHandoff.reuseExistingClient === true,
  );

  const summary = buildLaunchConfirmationSummary(handoffPayload);
  check("confirmation claims invitations will be sent", summary.invitationsWillBeSent === true);
  check(
    "confirmation lists reuse of linked client",
    summary.createsRecords.some((line) => line.toLowerCase().includes("reuse")),
  );
  check(
    "confirmation mentions portal access invitation",
    summary.invitationStatusLabel.toLowerCase().includes("portal access"),
  );
  check(
    "confirmation never says invite queued",
    !summary.invitationStatusLabel.toLowerCase().includes("queued"),
  );

  const orchestrate = read("lib/client-launch-wizard/launch/orchestrate.ts");
  check(
    "orchestrate uses Portal Access invitations",
    orchestrate.includes("inviteTeamViaPortalAccess"),
  );
  check(
    "orchestrate no longer creates discarded temp passwords",
    !orchestrate.includes("randomBytes") && !orchestrate.includes("inviteQueued: true"),
  );
  check(
    "orchestrate marks commercial handoff complete",
    orchestrate.includes("markCommercialLaunchCompleted"),
  );

  const launchServer = read("lib/client-launch-wizard/server.ts");
  check(
    "launchFromDraft excludes linked commercial client from name/slug collisions",
    launchServer.includes("reuseLinkedClientId") &&
      launchServer.includes("excludeClientId"),
  );

  const startRoute = read("app/api/admin/commercial-launch-handoff/start/route.ts");
  check("start handoff API exists", startRoute.includes("startCommercialLaunchHandoff"));

  const checkout = read("app/api/proposal/[publicToken]/checkout/route.ts");
  check(
    "legacy checkout guards modern proposals",
    checkout.includes("isModernCommercialProposal") &&
      checkout.includes("modern-lifecycle-required"),
  );

  const lifecyclePanel = read(
    "components/admin/operations/client-command/commercial/CommercialLifecyclePanel.tsx",
  );
  check(
    "lifecycle panel exposes Start Client Launch",
    lifecyclePanel.includes("StartClientLaunchButton"),
  );

  const welcome = read("components/ces/portal/CesPortalWelcome.tsx");
  check(
    "welcome includes next-steps experience",
    welcome.includes("engagementActiveEyebrow") &&
      welcome.includes("needsFromYouHeading") &&
      welcome.includes("kxdDoingHeading"),
  );
  check(
    "portal language defines next-steps copy",
    Boolean(PORTAL_CLIENT_LANGUAGE.engagementActiveTitle) &&
      PORTAL_CLIENT_LANGUAGE.needsFromYouItems.length >= 3,
  );

  const confirmation = read("lib/client-launch-wizard/launch/confirmation.ts");
  check(
    "confirmation no longer hardcodes invitationsWillBeSent false",
    !confirmation.includes("invitationsWillBeSent: false"),
  );

  console.log("\nAll commercial launch handoff V0 checks passed.\n");
}

main();
