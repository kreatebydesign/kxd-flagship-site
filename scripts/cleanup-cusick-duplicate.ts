/**
 * One-time Cusick duplicate cleanup — merges client 13 into canonical client 5.
 * Run: npx tsx scripts/cleanup-cusick-duplicate.ts
 */
import { getPayload } from "payload";
import config from "../payload.config";

const CANONICAL_CLIENT_ID = 5;
const DUPLICATE_CLIENT_ID = 13;
const CANONICAL_WEBSITE = "https://www.cusickmotorsports.com";
const CANONICAL_RETAINER_ID = 2;
const DUPLICATE_RETAINER_ID = 9;

function resolveClientId(
  client: number | { id: number } | null | undefined,
): number | null {
  if (client == null) return null;
  return typeof client === "object" ? client.id : client;
}

async function main() {
  const payload = await getPayload({ config });

  let canonical = await payload.findByID({
    collection: "clients",
    id: CANONICAL_CLIENT_ID,
  });

  let duplicate: Awaited<ReturnType<typeof payload.findByID>> | null = null;
  try {
    duplicate = await payload.findByID({
      collection: "clients",
      id: DUPLICATE_CLIENT_ID,
    });
  } catch {
    duplicate = null;
  }

  if (!canonical || canonical.slug !== "cusick-morgan-motorsports") {
    throw new Error("Canonical client 5 not found or slug mismatch.");
  }

  const duplicateProfiles = await payload.find({
    collection: "executive-client-profiles",
    where: { client: { equals: DUPLICATE_CLIENT_ID } },
    limit: 10,
  });

  const movedProfileIds: number[] = [];
  for (const profile of duplicateProfiles.docs) {
    const moved = await payload.update({
      collection: "executive-client-profiles",
      id: profile.id as number,
      data: {
        client: CANONICAL_CLIENT_ID,
        profileTitle: "Cusick Morgan Motorsports",
      },
    });
    movedProfileIds.push(moved.id as number);
  }

  const duplicateTimeline = await payload.find({
    collection: "client-timeline-events",
    where: { client: { equals: DUPLICATE_CLIENT_ID } },
    limit: 50,
  });

  const movedTimelineIds: number[] = [];
  for (const event of duplicateTimeline.docs) {
    const updated = await payload.update({
      collection: "client-timeline-events",
      id: event.id as number,
      data: { client: CANONICAL_CLIENT_ID },
    });
    movedTimelineIds.push(updated.id as number);
  }

  const canonicalRetainer = await payload.findByID({
    collection: "retainers",
    id: CANONICAL_RETAINER_ID,
  });
  const canonicalRetainerClientId = resolveClientId(
    canonicalRetainer?.client as number | { id: number },
  );
  if (!canonicalRetainer || canonicalRetainerClientId !== CANONICAL_CLIENT_ID) {
    throw new Error("Canonical retainer 2 missing or not linked to client 5.");
  }

  await payload.update({
    collection: "retainers",
    id: CANONICAL_RETAINER_ID,
    data: {
      retainerName: "Cusick Morgan Motorsports — Monthly Retainer",
      monthlyAmount: 300,
      billingStatus: "active",
      billingCadence: "monthly",
      autoRenew: true,
    },
  });

  let removedRetainerId: number | null = null;
  try {
    const duplicateRetainer = await payload.findByID({
      collection: "retainers",
      id: DUPLICATE_RETAINER_ID,
    });
    const duplicateRetainerClientId = resolveClientId(
      duplicateRetainer?.client as number | { id: number },
    );
    if (duplicateRetainer && duplicateRetainerClientId === DUPLICATE_CLIENT_ID) {
      await payload.delete({
        collection: "retainers",
        id: DUPLICATE_RETAINER_ID,
      });
      removedRetainerId = DUPLICATE_RETAINER_ID;
    }
  } catch {
    // already removed
  }

  const duplicateClient = duplicate as {
    primaryContactName?: string | null;
    nextAction?: string | null;
    notes?: string | null;
    slug?: string;
  } | null;

  await payload.update({
    collection: "clients",
    id: CANONICAL_CLIENT_ID,
    data: {
      companyWebsite: CANONICAL_WEBSITE,
      monthlyRetainerAmount: 300,
      brandTier: "flagship",
      primaryContactName:
        duplicateClient?.primaryContactName ||
        (canonical.primaryContactName as string | undefined) ||
        undefined,
      nextAction:
        duplicateClient?.nextAction ||
        (canonical.nextAction as string | undefined) ||
        undefined,
      notes: duplicateClient?.notes
        ? `${canonical.notes ?? ""}\n\n--- Import merge ---\n${duplicateClient.notes}`
        : (canonical.notes as string | undefined),
    },
  });

  let duplicateClientRemoved: number | null = null;
  if (duplicateClient && duplicateClient.slug === "cusick-motorsports") {
    await payload.delete({
      collection: "clients",
      id: DUPLICATE_CLIENT_ID,
    });
    duplicateClientRemoved = DUPLICATE_CLIENT_ID;
  }

  canonical = await payload.findByID({
    collection: "clients",
    id: CANONICAL_CLIENT_ID,
  });

  console.log(
    JSON.stringify({
      canonicalClientId: CANONICAL_CLIENT_ID,
      canonicalName: canonical?.name,
      canonicalSlug: canonical?.slug,
      canonicalWebsite: canonical?.companyWebsite,
      duplicateClientRemoved,
      movedProfileIds,
      movedTimelineIds,
      retainedRetainerId: CANONICAL_RETAINER_ID,
      removedRetainerId,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
