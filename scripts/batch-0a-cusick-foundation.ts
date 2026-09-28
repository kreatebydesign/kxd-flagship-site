/**
 * Batch 0A — Cusick portfolio foundation (production-controlled).
 *
 * Creates:
 * - CES experience profiles for clients 5 / 9 / 14 / 10
 * - Don invitation DRAFT (not sent) with four client-owner memberships
 * - Optionally deactivates confirmed Townsgate Inventory QA membership
 *
 * Does NOT:
 * - send invitation email
 * - invent/share a password
 * - create an activated portal-users login (canonical activation creates the user)
 * - invent GA4/GSC mappings
 * - ingest/sync Google
 * - fabricate work/reports
 *
 * Usage (production):
 *   KXD_CONFIRM_CUSICK_BATCH_0A=1 APPLY=1 \
 *     KXD_SERVER_ONLY_SHIM=1 node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/batch-0a-cusick-foundation.ts
 *
 * Dry-run (default): omit APPLY=1
 */

import { randomBytes } from "node:crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import { buildDefaultCesProfileData } from "../lib/client-launch/defaults";
import { createPortalInvitationDraft } from "../lib/portal/identity/invitations";
import {
  ensurePortalMembership,
  listPortalMembershipsForUser,
  syncPortalUserLegacyClientAndPreference,
} from "../lib/portal/memberships";
import {
  formatDbTarget,
  loadPayloadEnv,
  resolveDbTarget,
} from "./lib/payload-db-target";

const APPLY = process.env.APPLY === "1";
const CONFIRMED = process.env.KXD_CONFIRM_CUSICK_BATCH_0A === "1";
const CREATE_INACTIVE_USER = process.env.CREATE_INACTIVE_PORTAL_USER === "1";

const DON_EMAIL = "don.cusick@deezco.com";
const DON_NAME = "Don Cusick";

const CLIENTS = [
  {
    id: 5,
    slug: "cusick-morgan-motorsports",
    name: "Cusick Morgan Motorsports",
    defaultMembership: true,
    enabledModules: [
      "website-review",
      "deliverables",
      "requests",
      "reports",
      "website-analytics",
      "seo",
      "executive-reporting",
    ],
  },
  {
    id: 9,
    slug: "otp",
    name: "On Track Performance",
    defaultMembership: false,
    enabledModules: [
      "website-review",
      "deliverables",
      "requests",
      "reports",
      "website-analytics",
      "seo",
      "executive-reporting",
    ],
  },
  {
    id: 14,
    slug: "otp-carts",
    name: "OTP Carts",
    defaultMembership: false,
    // Inventory intentionally omitted: production inventory count is 0 / not client-ready.
    enabledModules: [
      "website-review",
      "deliverables",
      "requests",
      "reports",
      "website-analytics",
      "seo",
      "executive-reporting",
    ],
  },
  {
    id: 10,
    slug: "2475-townsgate",
    name: "2475 Townsgate",
    defaultMembership: false,
    enabledModules: [
      "website-review",
      "deliverables",
      "requests",
      "reports",
      "website-analytics",
      "seo",
      "executive-reporting",
    ],
  },
] as const;

const HIDDEN_BY_OMISSION = [
  "advisor",
  "resources",
  "meetings",
  "projects",
  "assets",
  "inventory",
  "executive-performance",
  "executive-review",
  "website-workspace",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const n = Number((value as AnyDoc).id);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function main() {
  loadPayloadEnv();
  const target = resolveDbTarget();
  console.log("\n=== BATCH 0A — Cusick foundation ===\n");
  console.log(`DB target: ${formatDbTarget(target)}`);
  console.log(`Mode: ${APPLY ? "APPLY (writes enabled)" : "DRY-RUN (no writes)"}`);
  console.log(
    `Inactive portal user materialization: ${CREATE_INACTIVE_USER ? "YES" : "NO (invitation draft only)"}`,
  );

  if (!target.isRemote || target.kind !== "remote-postgres") {
    throw new Error("Refusing Batch 0A against a non-remote Postgres target.");
  }
  if (!CONFIRMED) {
    throw new Error("Set KXD_CONFIRM_CUSICK_BATCH_0A=1 to acknowledge production scope.");
  }

  console.log("\n--- EXECUTION PLAN ---");
  console.log("1. Verify clients 5/9/14/10 exist with expected slugs");
  console.log("2. Create missing CES profiles with curated enabledModules");
  console.log("3. Preserve OTP Carts GA4/GSC mappings (no Google mapping writes)");
  console.log("4. Create Don invitation DRAFT (sendCount=0, status=draft) — NO email");
  if (CREATE_INACTIVE_USER) {
    console.log(
      "5. Create inactive portal user + four memberships (password never printed; active=false)",
    );
  } else {
    console.log(
      "5. Do NOT create portal-users yet (password required on create; activation sets password)",
    );
  }
  console.log("6. Deactivate Townsgate QA membership #6 if still active QA identity");
  console.log("7. Read-only validation summary");
  console.log("\nIntended CES modules:");
  for (const c of CLIENTS) {
    console.log(`  ${c.name} (#${c.id}): ${c.enabledModules.join(", ")}`);
  }
  console.log(`Intentionally omitted: ${HIDDEN_BY_OMISSION.join(", ")}`);

  const payload = await getPayload({ config });

  // 1) Verify clients
  for (const c of CLIENTS) {
    const doc = (await payload.findByID({
      collection: "clients",
      id: c.id,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    if (String(doc.slug) !== c.slug) {
      throw new Error(
        `Client #${c.id} slug mismatch: expected ${c.slug}, got ${doc.slug}`,
      );
    }
    console.log(`✔ client #${c.id} ${doc.name} (${doc.slug})`);
  }

  // 2) CES profiles
  const cesResults: Record<string, { id: number; created: boolean; modules: string[] }> =
    {};
  for (const c of CLIENTS) {
    const existing = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-experience-profiles" as any,
      where: { client: { equals: c.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      const doc = existing.docs[0] as AnyDoc;
      cesResults[c.slug] = {
        id: Number(doc.id),
        created: false,
        modules: Array.isArray(doc.enabledModules)
          ? (doc.enabledModules as string[])
          : [],
      };
      console.log(`· CES already exists for ${c.slug} id=${doc.id} (left unchanged)`);
      continue;
    }

    const data = buildDefaultCesProfileData({
      clientName: c.name,
      clientSlug: c.slug,
      enabledModules: [...c.enabledModules] as never,
    });

    if (!APPLY) {
      console.log(`[dry-run] would create CES for ${c.slug}`);
      cesResults[c.slug] = { id: -1, created: true, modules: [...c.enabledModules] };
      continue;
    }

    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-experience-profiles" as any,
      data: {
        ...data,
        client: c.id,
        enabledModules: [...c.enabledModules],
      },
      overrideAccess: true,
    });
    cesResults[c.slug] = {
      id: Number(created.id),
      created: true,
      modules: [...c.enabledModules],
    };
    console.log(`✔ created CES #${created.id} for ${c.slug}`);
  }

  // 3) Google mappings — read only
  const googleState: Record<
    string,
    { ga4: boolean; gsc: boolean; changed: false }
  > = {};
  for (const c of CLIENTS) {
    const infra = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      where: { client: { equals: c.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = (infra.docs[0] as AnyDoc) || null;
    googleState[c.slug] = {
      ga4: Boolean(String(doc?.ga4PropertyId || "").trim()),
      gsc: Boolean(String(doc?.searchConsoleSiteUrl || "").trim()),
      changed: false,
    };
    console.log(
      `· Google ${c.slug}: GA4=${googleState[c.slug].ga4 ? "SET" : "NOT_SET"} GSC=${googleState[c.slug].gsc ? "SET" : "NOT_SET"} (unchanged)`,
    );
  }

  // 4) Invitation draft
  let invitationId: number | null = null;
  const existingInvites = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    where: { email: { equals: DON_EMAIL } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });
  if (existingInvites.docs.length > 0) {
    invitationId = Number((existingInvites.docs[0] as AnyDoc).id);
    console.log(
      `· invitation already exists for Don id=${invitationId} status=${(existingInvites.docs[0] as AnyDoc).status}`,
    );
  } else if (!APPLY) {
    console.log("[dry-run] would create invitation DRAFT for Don (not sent)");
  } else {
    const draft = await createPortalInvitationDraft({
      email: DON_EMAIL,
      displayName: DON_NAME,
      welcomeNote:
        "Batch 0A foundation draft — do not send until activation batch is approved.",
      allowExistingUserExpansion: false,
      memberships: CLIENTS.map((c) => ({
        clientId: c.id,
        role: "client-owner" as const,
      })),
    });
    invitationId = draft.id;
    if (draft.status !== "draft" || draft.sendCount !== 0) {
      throw new Error(
        `Invitation created in unexpected state status=${draft.status} sendCount=${draft.sendCount}`,
      );
    }
    console.log(
      `✔ invitation DRAFT #${invitationId} created (status=draft sendCount=0) — NOT sent`,
    );
  }

  // 5) Optional inactive portal user + memberships
  let portalUserId: number | null = null;
  const membershipRows: Array<{
    business: string;
    clientId: number;
    membershipId: number;
    role: string;
    status: string;
    isDefault: boolean;
  }> = [];

  const existingUser = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { email: { equals: DON_EMAIL } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existingUser.docs.length > 0) {
    portalUserId = Number((existingUser.docs[0] as AnyDoc).id);
    console.log(`· portal user already exists id=${portalUserId}`);
  } else if (CREATE_INACTIVE_USER) {
    if (!APPLY) {
      console.log(
        "[dry-run] would create inactive portal user + four memberships (password undisclosed)",
      );
    } else {
      // Required by PortalUsers create hook; never printed or emailed.
      const ephemeralPassword = `kx-${randomBytes(32).toString("base64url")}`;
      const created = await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        data: {
          email: DON_EMAIL,
          displayName: DON_NAME,
          client: 5,
          lastActiveClientId: 5,
          active: false,
          password: ephemeralPassword,
        },
        overrideAccess: true,
      });
      portalUserId = Number(created.id);
      for (const c of CLIENTS) {
        const m = await ensurePortalMembership({
          portalUserId,
          clientId: c.id,
          role: "client-owner",
          isDefault: c.defaultMembership,
          notes: "Batch 0A Cusick foundation — inactive until activation batch",
          payload,
        });
        membershipRows.push({
          business: c.name,
          clientId: c.id,
          membershipId: m.id,
          role: m.role ?? "client-owner",
          status: m.status,
          isDefault: m.isDefault,
        });
      }
      await syncPortalUserLegacyClientAndPreference({
        portalUserId,
        clientId: 5,
        payload,
      });
      console.log(
        `✔ inactive portal user #${portalUserId} + ${membershipRows.length} memberships (active=false; no credentials disclosed)`,
      );
    }
  } else {
    console.log(
      "· portal user not created (canonical: created on invitation acceptance with Don-chosen password)",
    );
  }

  if (portalUserId != null && membershipRows.length === 0) {
    const existingMemberships = await listPortalMembershipsForUser(portalUserId, {
      payload,
    });
    for (const c of CLIENTS) {
      let m = existingMemberships.find((row) => row.clientId === c.id);
      if (!m && APPLY) {
        m = await ensurePortalMembership({
          portalUserId,
          clientId: c.id,
          role: "client-owner",
          isDefault: c.defaultMembership,
          payload,
        });
      }
      if (m) {
        membershipRows.push({
          business: c.name,
          clientId: c.id,
          membershipId: m.id,
          role: m.role ?? "client-owner",
          status: m.status,
          isDefault: m.isDefault,
        });
      }
    }
    if (APPLY) {
      await syncPortalUserLegacyClientAndPreference({
        portalUserId,
        clientId: 5,
        payload,
      });
    }
  }

  // 6) Townsgate QA membership
  let qaAction: "deactivated" | "already-disabled" | "skipped-dry-run" | "not-found" =
    "not-found";
  const qaUser = (await payload
    .findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: 7,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)) as AnyDoc | null;

  const qaMembership = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-client-memberships" as any,
    where: {
      and: [{ id: { equals: 6 } }, { client: { equals: 10 } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (
    qaUser &&
    String(qaUser.displayName || "") === "Inventory QA Other" &&
    String(qaUser.email || "").endsWith("@kxd.local") &&
    qaMembership.docs.length > 0
  ) {
    const m = qaMembership.docs[0] as AnyDoc;
    if (m.status === "disabled") {
      qaAction = "already-disabled";
      console.log("· QA membership #6 already disabled");
    } else if (!APPLY) {
      qaAction = "skipped-dry-run";
      console.log("[dry-run] would disable QA membership #6 on Townsgate");
    } else {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-client-memberships" as any,
        id: 6,
        data: {
          status: "disabled",
          isDefault: false,
          notes: "Batch 0A: deactivated confirmed Inventory QA Other test membership",
        },
        overrideAccess: true,
      });
      qaAction = "deactivated";
      console.log("✔ disabled QA membership #6 (Inventory QA Other @ kxd.local)");
    }
  } else {
    console.log("· QA membership not matched — no mutation");
  }

  // Invitation membership rows for report
  let invitationMemberships: Array<{
    id: number;
    clientId: number;
    role: string;
  }> = [];
  if (invitationId != null) {
    const rows = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-invitation-memberships" as any,
      where: { invitation: { equals: invitationId } },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    });
    invitationMemberships = (rows.docs as AnyDoc[]).map((d) => ({
      id: Number(d.id),
      clientId: relId(d.client) ?? -1,
      role: String(d.role || ""),
    }));
  }

  console.log("\n=== RESULT_JSON ===");
  console.log(
    JSON.stringify(
      {
        apply: APPLY,
        cesResults,
        googleState,
        invitationId,
        invitationMemberships,
        portalUserId,
        membershipRows,
        qaAction,
        donEmail: DON_EMAIL,
        hiddenByOmission: HIDDEN_BY_OMISSION,
      },
      null,
      2,
    ),
  );

  if (!APPLY) {
    console.log("\nDry-run complete. Re-run with APPLY=1 to write.\n");
  } else {
    console.log("\nBatch 0A apply complete.\n");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
