/**
 * Post-cleanup verification for Website Workspace request #16 removal.
 * Run: npx tsx scripts/verify-ws-request-16-gone.ts
 */
import { getPayload } from "payload";
import config from "../payload.config";

async function main() {
  const payload = await getPayload({ config });

  const workspace = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    where: { experienceModule: { equals: "website-workspace" } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  const reviewInboxLike = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    where: {
      or: [
        { experienceModule: { equals: "website-workspace" } },
        { experienceModule: { equals: "website-review" } },
      ],
      and: [{ id: { equals: 16 } }],
    },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });

  const leftovers = {
    media: (
      await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-review-media" as any,
        where: { relatedRequest: { equals: 16 } },
        limit: 5,
        depth: 0,
        overrideAccess: true,
      })
    ).totalDocs,
    tasks: (
      await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-tasks" as any,
        where: { relatedRequest: { equals: 16 } },
        limit: 5,
        depth: 0,
        overrideAccess: true,
      })
    ).totalDocs,
    events: (
      await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "executive-timeline-events" as any,
        where: { request: { equals: 16 } },
        limit: 5,
        depth: 0,
        overrideAccess: true,
      })
    ).totalDocs,
    actions: (
      await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-actions" as any,
        where: { relatedRequest: { equals: 16 } },
        limit: 5,
        depth: 0,
        overrideAccess: true,
      })
    ).totalDocs,
    communications: (
      await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-communications" as any,
        where: { relatedRequest: { equals: 16 } },
        limit: 5,
        depth: 0,
        overrideAccess: true,
      })
    ).totalDocs,
  };

  console.log({
    websiteWorkspaceRequestCount: workspace.totalDocs,
    request16InReviewScope: reviewInboxLike.totalDocs,
    leftovers,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
