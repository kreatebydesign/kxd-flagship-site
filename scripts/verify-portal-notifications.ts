/**
 * Phase 35A.1 — Client Notifications isolation + live-flow verification.
 * Run:
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/verify-portal-notifications.ts
 */
import { getPayload } from "payload";
import config from "../payload.config";
import {
  assertOwnedClientVisibleNotification,
  getClientNotificationCenter,
  getClientNotificationSummary,
  markClientNotificationRead,
} from "../lib/ces/modules/notifications/data";
import { activityItemId } from "../lib/activity-engine/href";
import { portalNotificationReaderKey } from "../lib/ces/modules/notifications/map";

async function main() {
  const payload = await getPayload({ config });

  const primal = await payload.find({
    collection: "clients",
    where: { slug: { equals: "primal-motorsports" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const client = primal.docs[0] as { id: number } | undefined;
  if (!client) throw new Error("Primal client missing");

  const otherClients = await payload.find({
    collection: "clients",
    where: { id: { not_equals: client.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const other = otherClients.docs[0] as { id: number } | undefined;

  const portalUsers = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { client: { equals: client.id } },
    limit: 2,
    depth: 0,
    overrideAccess: true,
  });
  const users = portalUsers.docs as Array<{ id: number; email?: string }>;
  if (users.length === 0) throw new Error("No Primal portal users");

  const userA = users[0]!;
  const userB = users[1] ?? users[0]!;

  const visible = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: {
      and: [
        { client: { equals: client.id } },
        { internalOnly: { equals: false } },
      ],
    },
    limit: 20,
    depth: 0,
    sort: "-occurredAt",
    overrideAccess: true,
  });

  const internal = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: {
      and: [
        { client: { equals: client.id } },
        { internalOnly: { equals: true } },
      ],
    },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });

  const feed = await getClientNotificationCenter({
    clientId: client.id,
    portalUserId: userA.id,
    limit: 40,
  });
  const summary = await getClientNotificationSummary({
    clientId: client.id,
    portalUserId: userA.id,
  });

  const feedIds = new Set(feed.items.map((i) => i.id));
  const leakedInternal = (internal.docs as Array<{ id: number }>).some((doc) =>
    feedIds.has(activityItemId(doc.id)),
  );

  let crossClientBlocked = true;
  if (other) {
    const foreign = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-timeline-events" as any,
      where: {
        and: [
          { client: { equals: other.id } },
          { internalOnly: { equals: false } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const foreignDoc = foreign.docs[0] as { id: number } | undefined;
    if (foreignDoc) {
      const owned = await assertOwnedClientVisibleNotification({
        activityId: activityItemId(foreignDoc.id),
        clientId: client.id,
      });
      crossClientBlocked = !owned.ok;

      const mark = await markClientNotificationRead({
        activityId: activityItemId(foreignDoc.id),
        clientId: client.id,
        portalUserId: userA.id,
      });
      if (mark.success) crossClientBlocked = false;
    }
  }

  let internalBlocked = true;
  const internalDoc = internal.docs[0] as { id: number } | undefined;
  if (internalDoc) {
    const owned = await assertOwnedClientVisibleNotification({
      activityId: activityItemId(internalDoc.id),
      clientId: client.id,
    });
    internalBlocked = !owned.ok;
  }

  const eventTypes = (visible.docs as Array<{ eventType?: string }>).map((d) =>
    String(d.eventType ?? ""),
  );
  const kindsPresent = {
    websiteReview: eventTypes.some((t) => t.startsWith("website-review.")),
    websiteWorkspace: eventTypes.some((t) => t.startsWith("website-workspace.")),
    inventory: eventTypes.some((t) => t.startsWith("inventory.")),
    reporting: eventTypes.some((t) => t.startsWith("reporting.")),
  };

  const hrefSafe = feed.items.every(
    (item) => item.href == null || item.href.startsWith("/portal"),
  );

  console.log(
    JSON.stringify(
      {
        primalClientId: client.id,
        portalUserA: userA.id,
        portalUserB: userB.id,
        readerKeyA: portalNotificationReaderKey(userA.id),
        visibleEventCount: visible.totalDocs,
        feedCount: feed.items.length,
        summaryUnread: summary.unreadCount,
        feedUnread: feed.unreadCount,
        summaryMatchesFeedUnread: summary.unreadCount === feed.unreadCount,
        leakedInternal,
        crossClientBlocked,
        internalBlocked,
        hrefSafe,
        kindsPresent,
        sample: feed.items.slice(0, 5).map((i) => ({
          id: i.id,
          kind: i.kind,
          title: i.title,
          href: i.href,
          read: i.read,
        })),
      },
      null,
      2,
    ),
  );

  if (leakedInternal) throw new Error("Internal events leaked into feed");
  if (!crossClientBlocked) throw new Error("Cross-client mark/read not blocked");
  if (!internalBlocked) throw new Error("Internal-only mark/read not blocked");
  if (!hrefSafe) throw new Error("Non-portal href exposed");
  if (summary.unreadCount !== feed.unreadCount) {
    throw new Error("Summary unread mismatch vs feed");
  }

  console.log("OK — portal notifications isolation checks passed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
