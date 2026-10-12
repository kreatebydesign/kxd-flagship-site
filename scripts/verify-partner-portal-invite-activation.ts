/**
 * Focused invite → password creation → activation coverage.
 *
 * Run:
 *   npm run verify:partner-portal-invite-activation
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getPayload } from "payload";
import config from "../payload.config";
import { assertPartnerActivationOrigin } from "../lib/portal/partner/activation-origin";
import {
  acceptPartnerInvitation,
  createPartnerInvitation,
  findPartnerInvitationByRawToken,
} from "../lib/portal/partner/invitations";
import { findActivePartnerProfileForUser } from "../lib/portal/partner/profile";

const ROOT = process.cwd();
let checks = 0;

async function check(label: string, fn: () => void | Promise<void>) {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function tokenFromUrl(url: string): string {
  const token = new URL(url).searchParams.get("token");
  assert.ok(token && token.length >= 16, "activate URL must include token");
  return token;
}

async function main() {
  console.log("\nverify-partner-portal-invite-activation\n");

  delete process.env.RESEND_API_KEY;

  await check("valid invite UI renders Create your password form fields", () => {
    const form = read("components/partner/PartnerActivateForm.tsx");
    assert.match(form, /Create your password/);
    assert.match(form, /partner-activate-password/);
    assert.match(form, /partner-activate-confirm/);
    assert.match(form, /aria-label="Create your password"/);
    assert.match(form, /\/api\/portal\/partner\/activate\/preview/);
    assert.match(form, /\/api\/portal\/partner\/activate\/accept/);
    assert.doesNotMatch(form, /console\.log\([^\)]*token/);
    assert.doesNotMatch(form, /console\.log\([^\)]*password/);
  });

  await check("activation page mounts PartnerActivateForm", () => {
    const page = read("app/(portal)/portal/(auth)/partner/activate/page.tsx");
    assert.match(page, /PartnerActivateForm/);
    assert.match(page, /variant="partner"/);
  });

  await check("Portal Users blocks active partner create / direct activation", () => {
    const hooks = read("payload/hooks/portal-users.ts");
    const collection = read("payload/collections/PortalUsers.ts");
    assert.match(hooks, /enforcePartnerInviteActivationHook/);
    assert.match(hooks, /Network Command → Invite partner/);
    assert.match(collection, /enforcePartnerInviteActivationHook/);
    assert.match(collection, /Invite partner only/);
  });

  await check("missing Origin same-site Network Host unlocks preview/accept guard", () => {
    const ok = assertPartnerActivationOrigin(
      new Request("https://network.kreatebydesign.com/api/portal/partner/activate/preview", {
        method: "POST",
        headers: {
          host: "network.kreatebydesign.com",
          "sec-fetch-site": "same-origin",
        },
      }),
      { NODE_ENV: "production", VERCEL_ENV: "production" },
    );
    assert.equal(ok.ok, true);
  });

  const suffix = randomBytes(4).toString("hex");
  const email = `invite-activation-${suffix}@example.com`;
  const manualEmail = `manual-partner-${suffix}@example.com`;
  const password = `InviteOk!${suffix}Aa1`;
  const payload = await getPayload({ config });

  const ids = {
    invitationId: 0,
    profileId: 0,
    portalUserId: 0,
  };

  try {
    const created = await createPartnerInvitation({
      displayName: `Invite Activation ${suffix}`,
      email,
      personalNote: null,
    });
    assert.ok(created.oneTimeActivateUrl, "one-time activate URL required when email fails");
    ids.invitationId = created.invitation.id;
    ids.profileId = created.invitation.partnerProfileId;
    ids.portalUserId = created.invitation.portalUserId;
    const rawToken = tokenFromUrl(created.oneTimeActivateUrl);

    await check("create invite links inactive portal user + invited profile", async () => {
      const user = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        id: ids.portalUserId,
        depth: 0,
        overrideAccess: true,
      })) as { active?: boolean; accessMode?: string };
      assert.equal(user.active, false);
      assert.equal(user.accessMode, "partner");

      const profile = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "kxd-partner-profiles" as any,
        id: ids.profileId,
        depth: 0,
        overrideAccess: true,
      })) as { status?: string };
      assert.equal(profile.status, "invited");

      const invite = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "kxd-partner-invitations" as any,
        id: ids.invitationId,
        depth: 0,
        overrideAccess: true,
      })) as { tokenHash?: string | null };
      assert.ok(invite.tokenHash, "token hash must be stored");
      assert.ok(!JSON.stringify(invite).includes(rawToken), "raw token must not persist");
    });

    await check("valid unused token resolves for password creation preview", async () => {
      const found = await findPartnerInvitationByRawToken(rawToken);
      assert.ok(found);
      assert.equal(found?.row.email, email);
    });

    await check("setting password completes activation and permits login", async () => {
      const accepted = await acceptPartnerInvitation({
        rawToken,
        password,
        displayName: `Invite Activation ${suffix}`,
      });
      assert.equal(accepted.ok, true);
      if (!accepted.ok) throw new Error("accept failed");

      const user = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        id: accepted.portalUserId,
        depth: 0,
        overrideAccess: true,
      })) as { active?: boolean };
      assert.equal(user.active, true);

      const active = await findActivePartnerProfileForUser(accepted.portalUserId);
      assert.equal(active?.id, accepted.partnerProfileId);

      const login = await payload.login({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        data: { email, password },
      });
      assert.ok(login.user);
    });

    await check("replayed token fails closed", async () => {
      const replay = await acceptPartnerInvitation({
        rawToken,
        password: `${password}X`,
      });
      assert.equal(replay.ok, false);
    });

    await check("direct active partner Portal User create is rejected", async () => {
      let rejected = false;
      try {
        await payload.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "portal-users" as any,
          data: {
            email: manualEmail,
            password: `Manual!${suffix}Aa1`,
            displayName: "Manual Partner",
            accessMode: "partner",
            active: true,
          },
          overrideAccess: true,
        });
      } catch {
        rejected = true;
      }
      assert.equal(rejected, true);
    });

    await check("malformed / unknown tokens fail closed", async () => {
      assert.equal(await findPartnerInvitationByRawToken("short"), null);
      const nonsense = await acceptPartnerInvitation({
        rawToken: randomBytes(24).toString("base64url"),
        password,
      });
      assert.equal(nonsense.ok, false);
    });
  } finally {
    for (const [collection, id] of [
      ["kxd-partner-invitations", ids.invitationId],
      ["kxd-partner-profiles", ids.profileId],
      ["portal-users", ids.portalUserId],
    ] as const) {
      if (!id) continue;
      try {
        await payload.delete({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: collection as any,
          id,
          overrideAccess: true,
        });
      } catch {
        /* best effort */
      }
    }
    try {
      const manual = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        where: { email: { equals: manualEmail } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (manual.docs[0]) {
        await payload.delete({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "portal-users" as any,
          id: Number(manual.docs[0].id),
          overrideAccess: true,
        });
      }
    } catch {
      /* ignore */
    }
  }

  console.log(`\n${checks} checks passed.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
