/**
 * One-time Phase 34D verification cleanup.
 *
 * Deletes only conclusively identified QA artifacts for request #15
 * (Home · Hero, notes contain "Phase 34D schema verification").
 *
 * Run: npx tsx scripts/cleanup-phase34d-qa-request.ts
 */
import { getPayload } from "payload";
import config from "../payload.config";
import { parseClientReviewStorageRef } from "../lib/client-review-media/record";
import { getClientReviewStorageAdapter } from "../lib/client-review-media/storage";

const TARGET_REQUEST_ID = 15;
const NOTES_MARKER = "Phase 34D schema verification";
const TARGET_ATTACHMENT_NAME = "ws-test.png";
const WEBSITE_WORKSPACE_EXPERIENCE_MODULE = "website-workspace";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

async function deleteMediaObject(doc: AnyDoc): Promise<void> {
  const ref = parseClientReviewStorageRef(doc);
  if (!ref) return;
  try {
    const adapter = getClientReviewStorageAdapter(ref.provider);
    await adapter.delete(ref.key);
  } catch (err) {
    console.warn(`Storage delete failed for media #${doc.id}:`, err);
  }
}

async function main() {
  const payload = await getPayload({ config });

  let request: AnyDoc;
  try {
    request = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-requests" as any,
      id: TARGET_REQUEST_ID,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    console.log(`Request #${TARGET_REQUEST_ID} not found — nothing to delete.`);
    return;
  }

  const experienceModule = String(request.experienceModule ?? "");
  const details = String(request.requestDetails ?? "");
  const pageContext = String(request.pageContext ?? "");
  const title = String(request.requestTitle ?? "");

  const matches =
    experienceModule === WEBSITE_WORKSPACE_EXPERIENCE_MODULE &&
    details.includes(NOTES_MARKER) &&
    (pageContext.includes("Home · Hero") || title.includes("Home · Hero"));

  console.log("Candidate request:", {
    id: request.id,
    experienceModule,
    status: request.status,
    title,
    pageContext,
    notesMatch: details.includes(NOTES_MARKER),
  });

  if (!matches) {
    throw new Error(
      `Request #${TARGET_REQUEST_ID} does not match Phase 34D QA markers. Aborting.`,
    );
  }

  const attachments = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-review-media" as any,
    where: { relatedRequest: { equals: TARGET_REQUEST_ID } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  const attachmentRows = attachments.docs as AnyDoc[];
  console.log(
    "Attachments linked to request:",
    attachmentRows.map((doc) => ({
      id: doc.id,
      filename: doc.originalFilename,
      relatedRequest: doc.relatedRequest,
    })),
  );

  for (const doc of attachmentRows) {
    const filename = String(doc.originalFilename ?? "");
    if (filename !== TARGET_ATTACHMENT_NAME) {
      console.warn(
        `Unexpected attachment filename "${filename}" on QA request — will still delete with request cleanup.`,
      );
    }
  }

  const events = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: { request: { equals: TARGET_REQUEST_ID } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  console.log(
    "Timeline events linked:",
    (events.docs as AnyDoc[]).map((doc) => ({
      id: doc.id,
      eventType: doc.eventType,
      title: doc.title,
    })),
  );

  const tasks = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-tasks" as any,
    where: { relatedRequest: { equals: TARGET_REQUEST_ID } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  console.log(
    "Work items / tasks linked:",
    (tasks.docs as AnyDoc[]).map((doc) => ({
      id: doc.id,
      title: doc.title ?? doc.taskTitle,
      sourceType: doc.sourceType ?? doc.createdFrom,
    })),
  );

  for (const doc of attachmentRows) {
    await deleteMediaObject(doc);
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-review-media" as any,
      id: doc.id,
      overrideAccess: true,
    });
    console.log(`Deleted attachment #${doc.id} (${doc.originalFilename})`);
  }

  for (const doc of events.docs as AnyDoc[]) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-timeline-events" as any,
      id: doc.id,
      overrideAccess: true,
    });
    console.log(`Deleted timeline event #${doc.id}`);
  }

  for (const doc of tasks.docs as AnyDoc[]) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-tasks" as any,
      id: doc.id,
      overrideAccess: true,
    });
    console.log(`Deleted client-task #${doc.id}`);
  }

  await payload.delete({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    id: TARGET_REQUEST_ID,
    overrideAccess: true,
  });
  console.log(`Deleted client-request #${TARGET_REQUEST_ID}`);

  const leftoverMedia = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-review-media" as any,
    where: { relatedRequest: { equals: TARGET_REQUEST_ID } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  const leftoverEvents = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: { request: { equals: TARGET_REQUEST_ID } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  const leftoverTasks = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-tasks" as any,
    where: { relatedRequest: { equals: TARGET_REQUEST_ID } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });

  let mediaId3Exists = false;
  try {
    await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-review-media" as any,
      id: 3,
      depth: 0,
      overrideAccess: true,
    });
    mediaId3Exists = true;
  } catch {
    mediaId3Exists = false;
  }

  console.log("Post-cleanup leftovers:", {
    media: leftoverMedia.totalDocs,
    events: leftoverEvents.totalDocs,
    tasks: leftoverTasks.totalDocs,
    mediaId3Exists,
  });

  const remainingWorkspace = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    where: { experienceModule: { equals: WEBSITE_WORKSPACE_EXPERIENCE_MODULE } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  console.log(
    "Remaining website-workspace requests:",
    remainingWorkspace.totalDocs,
    (remainingWorkspace.docs as AnyDoc[]).map((doc) => ({
      id: doc.id,
      title: doc.requestTitle,
      status: doc.status,
    })),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
