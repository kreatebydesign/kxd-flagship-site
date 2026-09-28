/**
 * Cusick Final Access Provisioning + Authorization QA (production-controlled).
 *
 * - Preserves Don #13 inactive + 4 memberships + invitation #3 draft/unsent
 * - Provisions Billy Morgan for CMM #5 ONLY (inactive; draft invitation; no email)
 * - Runs membership / portfolio / switch / report / IDOR authorization QA
 *
 * Does NOT: push, deploy, publish reports, send invitations, activate users.
 *
 * Usage:
 *   KXD_CONFIRM_CUSICK_FINAL_ACCESS=1 \
 *     KXD_SERVER_ONLY_SHIM=1 node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/batch-cusick-final-access-qa.ts
 *
 *   APPLY=1  … write Billy provisioning (idempotent)
 */

import { randomBytes } from "node:crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import { createPortalInvitationDraft } from "../lib/portal/identity/invitations";
import {
  ensurePortalMembership,
  listPortalMembershipsForUser,
  switchPortalActiveClient,
  syncPortalUserLegacyClientAndPreference,
} from "../lib/portal/memberships";
import {
  isClientInActiveMemberships,
  resolveAuthorizedActiveClient,
} from "../lib/portal/membership-resolve";
import { resolvePortalAccountContext } from "../lib/portal/account-context";
import { resolveAuthorizedPortfolio } from "../lib/portal/authorized-portfolio/server";
import { resolvePortfolioAccess } from "../lib/portal/portfolio";
import { decidePortalReportAccess } from "../lib/portal/analytics-visibility/report-access";
import { resolvePortalWorkPerformance } from "../lib/portal/work-performance/server";
import { resolveExperienceProfile } from "../lib/ces/server";
import type { PortalSession } from "../lib/portal/session";
import {
  formatDbTarget,
  loadPayloadEnv,
  resolveDbTarget,
} from "./lib/payload-db-target";

const CONFIRMED = process.env.KXD_CONFIRM_CUSICK_FINAL_ACCESS === "1";
const APPLY = process.env.APPLY === "1";

const DON_EMAIL = "don.cusick@deezco.com";
const DON_ID = 13;
const DON_INVITE_ID = 3;
const BILLY_EMAIL = "billy.morgan@cusickmotorsports.com";
const BILLY_NAME = "Billy Morgan";
const CMM = 5;
const OTP = 9;
const OTP_CARTS = 14;
const TOWNSGATE = 10;
const DON_CLIENTS = [CMM, OTP, OTP_CARTS, TOWNSGATE] as const;
const REPORT_IDS = [5, 6, 7, 8] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function clientIdOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function syntheticSession(input: {
  portalUserId: number;
  clientId: number;
  clientName: string;
  email: string;
  displayName: string;
}): PortalSession {
  return {
    portalUserId: input.portalUserId,
    clientId: input.clientId,
    email: input.email,
    displayName: input.displayName,
    greetingName: input.displayName.split(" ")[0] ?? input.displayName,
    clientName: input.clientName,
    welcomeCompletedAt: null,
    isOperatorPreview: false,
    operatorPreview: null,
  };
}

function check(label: string, pass: boolean, detail?: string) {
  const line = pass
    ? `  ✔ ${label}`
    : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  if (!pass) throw new Error(detail ? `${label}: ${detail}` : label);
}

async function main() {
  loadPayloadEnv();
  const target = resolveDbTarget();
  console.log("\n=== CUSICK FINAL ACCESS PROVISIONING + AUTHORIZATION QA ===\n");
  console.log(`DB target: ${formatDbTarget(target)}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  if (!target.isRemote || target.kind !== "remote-postgres") {
    throw new Error("Refusing against a non-remote Postgres target.");
  }
  if (!CONFIRMED) {
    throw new Error("Set KXD_CONFIRM_CUSICK_FINAL_ACCESS=1 to acknowledge production scope.");
  }

  const payload = await getPayload({ config });
  const failures: string[] = [];

  // ── Don preserve ──────────────────────────────────────────────────────────
  const don = (await payload.findByID({
    collection: "portal-users",
    id: DON_ID,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  check("Don email", String(don.email).toLowerCase() === DON_EMAIL);
  check("Don active=false", don.active === false, `active=${don.active}`);
  check(
    "Don lastActive/default CMM",
    Number(don.lastActiveClientId) === CMM || Number(don.client) === CMM,
    `lastActive=${don.lastActiveClientId} client=${clientIdOf(don.client)}`,
  );

  const donMemberships = await listPortalMembershipsForUser(DON_ID, { payload });
  const donActiveIds = donMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.clientId)
    .sort((a, b) => a - b);
  check(
    "Don has exactly 4 active Cusick memberships",
    donActiveIds.join(",") === [...DON_CLIENTS].sort((a, b) => a - b).join(","),
    `got ${donActiveIds.join(",")}`,
  );

  const invite3 = (await payload.findByID({
    collection: "portal-invitations",
    id: DON_INVITE_ID,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  check("Don invite #3 draft", invite3.status === "draft");
  check("Don invite sendCount=0", Number(invite3.sendCount ?? 0) === 0);
  check("Don invite sentAt=null", invite3.sentAt == null);

  // ── Billy provision ───────────────────────────────────────────────────────
  let billyUserId: number | null = null;
  let billyMembershipId: number | null = null;
  let billyInviteId: number | null = null;

  const existingBilly = await payload.find({
    collection: "portal-users",
    where: { email: { equals: BILLY_EMAIL } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const existingBillyInvite = await payload.find({
    collection: "portal-invitations",
    where: { email: { equals: BILLY_EMAIL } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });

  if (existingBilly.docs.length > 0) {
    billyUserId = Number((existingBilly.docs[0] as AnyDoc).id);
    console.log(`· Billy portal user already exists #${billyUserId}`);
  } else if (!APPLY) {
    console.log("[dry-run] would create inactive Billy portal user + CMM membership");
  } else {
    // Satisfy PortalUsers create hook; never printed, logged, or emailed.
    const ephemeralPassword = `kx-${randomBytes(32).toString("base64url")}`;
    const created = await payload.create({
      collection: "portal-users",
      data: {
        email: BILLY_EMAIL,
        displayName: BILLY_NAME,
        client: CMM,
        lastActiveClientId: CMM,
        active: false,
        password: ephemeralPassword,
      },
      overrideAccess: true,
    });
    billyUserId = Number(created.id);
    // Drop local reference immediately — never surface.
    void ephemeralPassword;
    console.log(`✔ inactive Billy portal user #${billyUserId} created (active=false; credential undisclosed)`);
  }

  if (billyUserId != null) {
    const billyUser = (await payload.findByID({
      collection: "portal-users",
      id: billyUserId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    check("Billy active=false", billyUser.active === false, `active=${billyUser.active}`);

    if (APPLY || existingBilly.docs.length > 0) {
      const membership = await ensurePortalMembership({
        portalUserId: billyUserId,
        clientId: CMM,
        role: "client-owner",
        isDefault: true,
        notes: "Cusick final access — Billy CMM-only; inactive until invitation accepted",
        payload,
      });
      billyMembershipId = membership.id;
      await syncPortalUserLegacyClientAndPreference({
        portalUserId: billyUserId,
        clientId: CMM,
        payload,
      });

      // Ensure no unauthorized memberships exist for Billy
      const allBillyMem = await listPortalMembershipsForUser(billyUserId, { payload });
      const unauthorized = allBillyMem.filter(
        (m) => m.status === "active" && m.clientId !== CMM,
      );
      if (unauthorized.length > 0 && APPLY) {
        for (const m of unauthorized) {
          await payload.update({
            collection: "portal-client-memberships",
            id: m.id,
            data: { status: "disabled" },
            overrideAccess: true,
          });
          console.log(`✔ disabled unexpected Billy membership #${m.id} client=${m.clientId}`);
        }
      }
    }
  }

  if (existingBillyInvite.docs.length > 0) {
    billyInviteId = Number((existingBillyInvite.docs[0] as AnyDoc).id);
    console.log(
      `· Billy invitation already exists #${billyInviteId} status=${(existingBillyInvite.docs[0] as AnyDoc).status}`,
    );
  } else if (!APPLY) {
    console.log("[dry-run] would create Billy invitation DRAFT (not sent)");
  } else {
    const draft = await createPortalInvitationDraft({
      email: BILLY_EMAIL,
      displayName: BILLY_NAME,
      welcomeNote:
        "Cusick final access draft — CMM only. Do not send until activation is approved.",
      allowExistingUserExpansion: true,
      memberships: [{ clientId: CMM, role: "client-owner" }],
    });
    billyInviteId = draft.id;
    if (draft.status !== "draft" || draft.sendCount !== 0) {
      throw new Error(
        `Billy invite unexpected state status=${draft.status} sendCount=${draft.sendCount}`,
      );
    }
    console.log(`✔ Billy invitation DRAFT #${billyInviteId} (sendCount=0) — NOT sent`);
  }

  // Re-load Billy after writes
  const billyFinal = billyUserId
    ? ((await payload.findByID({
        collection: "portal-users",
        id: billyUserId,
        depth: 0,
        overrideAccess: true,
      })) as AnyDoc)
    : null;
  const billyMemberships = billyUserId
    ? await listPortalMembershipsForUser(billyUserId, { payload })
    : [];
  const billyActive = billyMemberships.filter((m) => m.status === "active");
  const billyInviteFinal = billyInviteId
    ? ((await payload.findByID({
        collection: "portal-invitations",
        id: billyInviteId,
        depth: 0,
        overrideAccess: true,
      })) as AnyDoc)
    : existingBillyInvite.docs[0]
      ? (existingBillyInvite.docs[0] as AnyDoc)
      : null;

  if (!APPLY && !billyUserId) {
    console.log("\n(Dry-run without Billy user — skipping Billy runtime authorization.)");
  } else {
    check("Billy provisioned", billyUserId != null);
    check("Billy only CMM membership", billyActive.length === 1 && billyActive[0]!.clientId === CMM);
    check("Billy lastActive CMM", Number(billyFinal?.lastActiveClientId) === CMM);
    check("Billy invite draft", billyInviteFinal?.status === "draft");
    check("Billy invite sendCount=0", Number(billyInviteFinal?.sendCount ?? 0) === 0);
    check("Billy invite sentAt=null", billyInviteFinal?.sentAt == null);
  }

  // ── Authorization matrices ────────────────────────────────────────────────
  console.log("\n--- DON ACCESS MATRIX ---");
  const donClients = await Promise.all(
    DON_CLIENTS.map(async (id) => {
      const c = (await payload.findByID({
        collection: "clients",
        id,
        depth: 0,
        overrideAccess: true,
      })) as AnyDoc;
      return { id, name: String(c.name) };
    }),
  );

  const donSession = syntheticSession({
    portalUserId: DON_ID,
    clientId: CMM,
    clientName: donClients.find((c) => c.id === CMM)!.name,
    email: DON_EMAIL,
    displayName: String(don.displayName ?? "Don Cusick"),
  });
  const donCtx = await resolvePortalAccountContext(donSession);
  check("Don authorizedClientIds = 4", donCtx.authorizedClientIds.length === 4);
  for (const id of DON_CLIENTS) {
    check(`Don authorized for #${id}`, donCtx.authorizedClientIds.includes(id));
  }
  check("Don switchingAvailable", donCtx.switchingAvailable === true);
  check("Don portfolioAccessAvailable", donCtx.portfolioAccessAvailable === true);
  check(
    "Don switcher has 4 accounts",
    (donCtx.switcher?.accounts.length ?? 0) === 4,
  );

  const donPortfolio = await resolveAuthorizedPortfolio({
    session: donSession,
    accountContext: donCtx,
  });
  check(
    "Don portfolio site count = 4",
    donPortfolio.availability === "ready" && donPortfolio.sites.length === 4,
    `availability=${donPortfolio.availability} sites=${donPortfolio.sites.length}`,
  );
  const donPortfolioIds = donPortfolio.sites.map((s) => s.clientId).sort((a, b) => a - b);
  check(
    "Don portfolio clients exact",
    donPortfolioIds.join(",") === [...DON_CLIENTS].sort((a, b) => a - b).join(","),
  );

  // lastActive validation — OTP preference ok; unauthorized rejected
  const donResolvedOtp = resolveAuthorizedActiveClient({
    memberships: donMemberships,
    lastActiveClientId: OTP,
    legacyClientId: CMM,
  });
  check("Don lastActive OTP resolves", donResolvedOtp?.clientId === OTP);

  if (billyUserId && billyFinal) {
    console.log("\n--- BILLY ACCESS MATRIX ---");
    const cmmName = donClients.find((c) => c.id === CMM)!.name;
    const billySession = syntheticSession({
      portalUserId: billyUserId,
      clientId: CMM,
      clientName: cmmName,
      email: BILLY_EMAIL,
      displayName: BILLY_NAME,
    });
    const billyCtx = await resolvePortalAccountContext(billySession);
    check("Billy authorized only CMM", billyCtx.authorizedClientIds.join(",") === String(CMM));
    check("Billy NOT OTP", !billyCtx.authorizedClientIds.includes(OTP));
    check("Billy NOT OTP Carts", !billyCtx.authorizedClientIds.includes(OTP_CARTS));
    check("Billy NOT 2475", !billyCtx.authorizedClientIds.includes(TOWNSGATE));
    check(
      "Billy switchingAvailable=false (single account)",
      billyCtx.switchingAvailable === false,
    );
    check(
      "Billy switcher null/empty",
      billyCtx.switcher == null || billyCtx.switcher.accounts.length <= 1,
    );

    const billyPortfolioAccess = resolvePortfolioAccess(billyCtx);
    // Single-account: portfolio access typically false / condensed
    console.log(
      `  · Billy portfolioAccessAvailable=${billyCtx.portfolioAccessAvailable} gate=${billyPortfolioAccess.available}`,
    );

    if (billyCtx.portfolioAccessAvailable && billyPortfolioAccess.available) {
      const billyPortfolio = await resolveAuthorizedPortfolio({
        session: billySession,
        accountContext: billyCtx,
      });
      check(
        "Billy portfolio only CMM if shown",
        billyPortfolio.sites.every((s) => s.clientId === CMM) &&
          billyPortfolio.sites.length <= 1,
        `sites=${billyPortfolio.sites.map((s) => s.clientId).join(",")}`,
      );
    } else {
      check("Billy single-account UX (no multi-site portfolio)", true);
    }

    // ── Account switch IDOR ─────────────────────────────────────────────────
    console.log("\n--- ACCOUNT SWITCH / IDOR ---");
    for (const target of [OTP, OTP_CARTS, TOWNSGATE]) {
      let denied = false;
      try {
        await switchPortalActiveClient({
          portalUserId: billyUserId,
          targetClientId: target,
        });
      } catch (err) {
        denied =
          err instanceof Error &&
          (err.message === "PORTAL_ACCOUNT_SWITCH_DENIED" ||
            /denied|unauthorized|membership/i.test(err.message));
      }
      check(`Billy switch to #${target} DENIED`, denied);
    }

    // lastActiveClientId cannot grant unauthorized client
    const poisoned = resolveAuthorizedActiveClient({
      memberships: billyMemberships,
      lastActiveClientId: OTP,
      legacyClientId: CMM,
    });
    check(
      "Billy poisoned lastActive OTP rebounds to CMM",
      poisoned?.clientId === CMM,
      `got ${poisoned?.clientId}`,
    );
    check(
      "Billy isClientInActiveMemberships OTP=false",
      isClientInActiveMemberships(billyMemberships, OTP) === false,
    );

    // Portfolio must never include unauthorized clients for Billy
    const billyPortfolioGate = resolvePortfolioAccess(billyCtx);
    if (billyPortfolioGate.available) {
      const billyPortfolio = await resolveAuthorizedPortfolio({
        session: billySession,
        accountContext: billyCtx,
      });
      check(
        "Billy portfolio never includes unauthorized clients",
        billyPortfolio.sites.every((s) => s.clientId === CMM),
      );
    } else {
      check(
        "Billy portfolio gate closed for single-account (expected)",
        billyPortfolioGate.reason === "single-account" ||
          billyPortfolioGate.reason === "not-enabled" ||
          billyPortfolioGate.reason === "switching-inactive",
        billyPortfolioGate.reason,
      );
    }

    // Forged active client outside memberships must not appear authorized
    for (const badId of [OTP, OTP_CARTS, TOWNSGATE]) {
      const badName =
        donClients.find((c) => c.id === badId)?.name ?? `Client ${badId}`;
      const forged = syntheticSession({
        portalUserId: billyUserId,
        clientId: badId,
        clientName: badName,
        email: BILLY_EMAIL,
        displayName: BILLY_NAME,
      });
      const forgedCtx = await resolvePortalAccountContext(forged);
      check(
        `Billy forged session #${badId} not in authorizedClientIds`,
        !forgedCtx.authorizedClientIds.includes(badId),
      );
      check(
        `Billy forged session #${badId} still only CMM authorized`,
        forgedCtx.authorizedClientIds.join(",") === String(CMM),
      );
    }

    // Work-performance isolation — CMM OK
    const billyCmmXp = await resolveExperienceProfile(billySession);
    check("Billy CES profile = CMM", billyCmmXp.identity.clientId === CMM);
    const billyWork = await resolvePortalWorkPerformance({
      session: billySession,
      experienceProfile: billyCmmXp,
      websiteReview: null,
    });
    check("Billy work-performance clientId=CMM", billyWork.clientId === CMM);
  }

  // ── Report authorization ──────────────────────────────────────────────────
  console.log("\n--- REPORT AUTHORIZATION ---");
  const reports = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    where: { id: { in: [...REPORT_IDS] } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  check("Exactly 4 Sept reports loaded", reports.docs.length === 4);
  for (const doc of reports.docs as AnyDoc[]) {
    check(
      `Report #${doc.id} unpublished`,
      doc.publishedAt == null && String(doc.status) !== "published",
      `status=${doc.status} publishedAt=${doc.publishedAt}`,
    );
    check(
      `Report #${doc.id} approved/frozen`,
      Boolean(doc.approvedSnapshot) && Boolean(doc.approvedFingerprint),
    );

    const reportClientId = clientIdOf(doc.client)!;
    // Current: unpublished → denied for everyone
    for (const authClient of DON_CLIENTS) {
      const decision = decidePortalReportAccess({
        report: { status: String(doc.status), client: doc.client },
        authorizedClientId: authClient,
      });
      check(
        `Unpublished report #${doc.id} denied for client #${authClient}`,
        decision.ok === false && decision.reason === "unpublished",
      );
    }

    // Future: if published, Don authorized for matching client; Billy only CMM
    const asPublished = { status: "published", client: doc.client };
    for (const authClient of DON_CLIENTS) {
      const donFuture = decidePortalReportAccess({
        report: asPublished,
        authorizedClientId: authClient,
      });
      const expectDon = authClient === reportClientId;
      check(
        `Future Don publish access report #${doc.id} as #${authClient}`,
        donFuture.ok === expectDon,
        `expected ${expectDon} got ${JSON.stringify(donFuture)}`,
      );
    }
    const billyFutureCmm = decidePortalReportAccess({
      report: asPublished,
      authorizedClientId: CMM,
    });
    check(
      `Future Billy CMM access report #${doc.id}`,
      billyFutureCmm.ok === (reportClientId === CMM),
    );
    for (const bad of [OTP, OTP_CARTS, TOWNSGATE]) {
      const billyFutureBad = decidePortalReportAccess({
        report: asPublished,
        authorizedClientId: bad,
      });
      // Billy wouldn't have this as authorizedClientId; if somehow used, only matching client passes
      if (reportClientId !== bad) {
        check(
          `Future Billy non-match report #${doc.id} vs #${bad}`,
          billyFutureBad.ok === false,
        );
      }
    }
  }

  // ── Don multi-account work isolation sample ───────────────────────────────
  console.log("\n--- DON MULTI-ACCOUNT UX ---");
  for (const clientId of DON_CLIENTS) {
    const name = donClients.find((c) => c.id === clientId)!.name;
    const scoped = syntheticSession({
      portalUserId: DON_ID,
      clientId,
      clientName: name,
      email: DON_EMAIL,
      displayName: String(don.displayName ?? "Don Cusick"),
    });
    const xp = await resolveExperienceProfile(scoped);
    check(`Don CES profile client #${clientId}`, xp.identity.clientId === clientId);
    const work = await resolvePortalWorkPerformance({
      session: scoped,
      experienceProfile: xp,
      websiteReview: null,
    });
    check(`Don work model client #${clientId}`, work.clientId === clientId);
  }

  // ── Safety reaffirm ───────────────────────────────────────────────────────
  console.log("\n--- SAFETY ---");
  const donReload = (await payload.findByID({
    collection: "portal-users",
    id: DON_ID,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  const invite3Reload = (await payload.findByID({
    collection: "portal-invitations",
    id: DON_INVITE_ID,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  check("Don still inactive", donReload.active === false);
  check("Invite #3 still draft", invite3Reload.status === "draft");
  check("Invite #3 sendCount=0", Number(invite3Reload.sendCount ?? 0) === 0);
  check("Invite #3 sentAt=null", invite3Reload.sentAt == null);

  if (billyFinal && billyInviteFinal) {
    check("Billy still inactive", billyFinal.active === false);
    check("Billy invite still draft", billyInviteFinal.status === "draft");
    check("Billy invite sendCount=0", Number(billyInviteFinal.sendCount ?? 0) === 0);
    check("Billy invite sentAt=null", billyInviteFinal.sentAt == null);
  }

  // Reports still unpublished
  for (const id of REPORT_IDS) {
    const r = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "monthly-reports" as any,
      id,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    check(`Report #${id} publishedAt=null`, r.publishedAt == null);
  }

  console.log("\n=== PROVISIONING SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        don: {
          id: DON_ID,
          active: donReload.active,
          authorizedClientIds: donActiveIds,
          invitation: {
            id: DON_INVITE_ID,
            status: invite3Reload.status,
            sendCount: invite3Reload.sendCount ?? 0,
            sentAt: invite3Reload.sentAt ?? null,
          },
        },
        billy: billyUserId
          ? {
              id: billyUserId,
              active: billyFinal?.active ?? null,
              membershipId: billyMembershipId,
              clientId: CMM,
              role: billyActive[0]?.role ?? null,
              defaultClientId: CMM,
              lastActiveClientId: billyFinal?.lastActiveClientId ?? null,
              invitation: billyInviteFinal
                ? {
                    id: billyInviteFinal.id,
                    status: billyInviteFinal.status,
                    sendCount: billyInviteFinal.sendCount ?? 0,
                    sentAt: billyInviteFinal.sentAt ?? null,
                  }
                : null,
              authorizedClientIds: billyActive.map((m) => m.clientId),
            }
          : { provisioned: false, mode: "dry-run" },
        reports: REPORT_IDS.map((id) => ({ id, publishedAt: null })),
        deployment: "NOT_PUSHED_NOT_DEPLOYED",
      },
      null,
      2,
    ),
  );

  if (!APPLY) {
    console.log("\nDry-run only for writes. Re-run with APPLY=1 to provision Billy.");
  }
  if (failures.length) {
    throw new Error(failures.join("\n"));
  }
  console.log("\nDone.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
