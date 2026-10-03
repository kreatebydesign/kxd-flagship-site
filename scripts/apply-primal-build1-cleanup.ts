/**
 * Primal Build 1 acceptance cleanup — gated production data correction.
 *
 *   CONFIRM=primal-build1-cleanup KXD_SERVER_ONLY_SHIM=1 npx tsx --env-file=.env.vercel.local \
 *     --import ./scripts/shims/register-server-only.mjs scripts/apply-primal-build1-cleanup.ts
 *
 * 1) Canonical Tyler Edwards display name
 * 2) Remove positively identified QA/test inquiries only
 * 3) Entitle website-analytics on the existing Primal experience profile
 */

import { getPayload } from "payload";
import config from "../payload.config";

const SLUG = "primal-motorsports";
const TYLER_EMAIL = "tyler.edwards@primalmotorsports.com";
const QA_INQUIRY_KEYS = [
  "PRIMAL-WEB-20260816-DA531198", // KXD Phase3Smoke
  "PRIMAL-WEB-20260824-126930B4", // MATT - TEST TESTING @ kreatebydesign.com
  "PRIMAL-WEB-20260825-B849CE7B", // matt last test last test aug 24 @ kreatebydesign.com
] as const;

async function deleteMatching(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: string,
  where: Record<string, unknown>,
  label: string,
): Promise<number> {
  const found = await payload.find({
    collection: collection as never,
    where: where as never,
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  let removed = 0;
  for (const doc of found.docs as Array<{ id: number }>) {
    await payload.delete({
      collection: collection as never,
      id: doc.id,
      overrideAccess: true,
    });
    removed += 1;
  }
  console.log(`${label}: removed ${removed}`);
  return removed;
}

async function main() {
  if (process.env.CONFIRM !== "primal-build1-cleanup") {
    throw new Error("Refusing to run without CONFIRM=primal-build1-cleanup");
  }

  const payload = await getPayload({ config });
  const clients = await payload.find({
    collection: "clients",
    where: { slug: { equals: SLUG } },
    limit: 1,
    overrideAccess: true,
  });
  const client = clients.docs[0] as { id: number } | undefined;
  if (!client) throw new Error("Primal client not found");

  const users = await payload.find({
    collection: "portal-users" as never,
    where: { email: { equals: TYLER_EMAIL } },
    limit: 1,
    overrideAccess: true,
  });
  const tyler = users.docs[0] as { id: number; displayName?: string } | undefined;
  if (!tyler) throw new Error("Tyler portal user not found");
  await payload.update({
    collection: "portal-users" as never,
    id: tyler.id,
      data: { displayName: "Tyler Edwards" } as never,
    overrideAccess: true,
  });
  console.log(`Updated portal-users#${tyler.id} displayName "${tyler.displayName}" → Tyler Edwards`);

  const inquiries = await payload.find({
    collection: "client-inquiries" as never,
    where: {
      and: [
        { client: { equals: client.id } },
        { inquiryKey: { in: [...QA_INQUIRY_KEYS] } },
      ],
    },
    limit: 20,
    overrideAccess: true,
  });
  const keys = (inquiries.docs as Array<{ id: number; inquiryKey: string }>).map(
    (row) => row.inquiryKey,
  );
  if (keys.length !== QA_INQUIRY_KEYS.length) {
    throw new Error(`Expected ${QA_INQUIRY_KEYS.length} QA inquiries, found ${keys.join(", ")}`);
  }

  for (const key of QA_INQUIRY_KEYS) {
    await deleteMatching(
      payload,
      "client-site-events",
      {
        and: [
          { clientKey: { equals: SLUG } },
          { externalEventId: { equals: key } },
        ],
      },
      `CSI ${key}`,
    );
  }

  const timeline = await payload.find({
    collection: "executive-timeline-events" as never,
    where: { client: { equals: client.id } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  let timelineRemoved = 0;
  for (const doc of timeline.docs as Array<Record<string, unknown>>) {
    const meta = (doc.metadata ?? {}) as Record<string, unknown>;
    const metaKey = String(meta.inquiryKey ?? "");
    if (!QA_INQUIRY_KEYS.includes(metaKey as (typeof QA_INQUIRY_KEYS)[number])) continue;
    await payload.delete({
      collection: "executive-timeline-events" as never,
      id: Number(doc.id),
      overrideAccess: true,
    });
    timelineRemoved += 1;
  }
  console.log(`Timeline events removed: ${timelineRemoved}`);

  for (const row of inquiries.docs as Array<{ id: number; inquiryKey: string }>) {
    await payload.delete({
      collection: "client-inquiries" as never,
      id: row.id,
      overrideAccess: true,
    });
    console.log(`Removed inquiry ${row.inquiryKey} (#${row.id})`);
  }

  const remaining = await payload.find({
    collection: "client-inquiries" as never,
    where: {
      and: [{ client: { equals: client.id } }, { clientKey: { equals: SLUG } }],
    },
    limit: 1,
    overrideAccess: true,
  });
  console.log(`Remaining Primal inquiries: ${remaining.totalDocs}`);

  const profiles = await payload.find({
    collection: "client-experience-profiles" as never,
    where: {
      and: [{ client: { equals: client.id } }, { status: { equals: "active" } }],
    },
    limit: 1,
    overrideAccess: true,
  });
  const profile = profiles.docs[0] as
    | { id: number; enabledModules?: string[] }
    | undefined;
  if (profile) {
    const modules = Array.isArray(profile.enabledModules)
      ? [...profile.enabledModules]
      : [];
    if (!modules.includes("website-analytics")) {
      modules.push("website-analytics");
      await payload.update({
        collection: "client-experience-profiles" as never,
        id: profile.id,
        data: { enabledModules: modules } as never,
        overrideAccess: true,
      });
      console.log(`Added website-analytics to experience profile #${profile.id}:`, modules);
    } else {
      console.log("website-analytics already entitled");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
