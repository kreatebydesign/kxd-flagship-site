/**
 * One-time cleanup: Website Workspace manual QA request #16
 * (Race · Programs, submitted under Adam’s portal account during testing).
 *
 * Run: npx tsx scripts/cleanup-website-workspace-request-16.ts
 */
import { getPayload } from "payload";
import config from "../payload.config";
import { parseClientReviewStorageRef } from "../lib/client-review-media/record";
import { getClientReviewStorageAdapter } from "../lib/client-review-media/storage";

const TARGET_REQUEST_ID = 16;
const WEBSITE_WORKSPACE_EXPERIENCE_MODULE = "website-workspace";
const PAGE_SECTION_MARKER = "Race · Programs";

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

function summarize(docs: AnyDoc[], pick: (doc: AnyDoc) => Record<string, unknown>) {
  return docs.map(pick);
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
  const pageContext = String(request.pageContext ?? "");
  const title = String(request.requestTitle ?? "");
  const requestedBy = String(request.requestedBy ?? "");
  const requestedByEmail = String(request.requestedByEmail ?? "");

  const matches =
    experienceModule === WEBSITE_WORKSPACE_EXPERIENCE_MODULE &&
    (pageContext.includes(PAGE_SECTION_MARKER) || title.includes(PAGE_SECTION_MARKER));

  console.log("Candidate request:", {
    id: request.id,
    experienceModule,
    status: request.status,
    title,
    pageContext,
    requestedBy,
    requestedByEmail,
  });

  if (!matches) {
    throw new Error(
      `Request #${TARGET_REQUEST_ID} does not match Race · Programs / website-workspace. Aborting.`,
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

  const events = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: { request: { equals: TARGET_REQUEST_ID } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  const eventRows = events.docs as AnyDoc[];

  const tasks = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-tasks" as any,
    where: { relatedRequest: { equals: TARGET_REQUEST_ID } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  const taskRows = tasks.docs as AnyDoc[];

  const actions = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-actions" as any,
    where: { relatedRequest: { equals: TARGET_REQUEST_ID } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  const actionRows = actions.docs as AnyDoc[];

  const communications = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-communications" as any,
    where: { relatedRequest: { equals: TARGET_REQUEST_ID } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  const communicationRows = communications.docs as AnyDoc[];

  const notifications = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "automation-notifications" as any,
    where: {
      or: [
        { title: { contains: String(TARGET_REQUEST_ID) } },
        { summary: { contains: String(TARGET_REQUEST_ID) } },
        { title: { contains: "Race · Programs" } },
        { summary: { contains: "Race · Programs" } },
        { title: { contains: "WS-0016" } },
        { summary: { contains: "WS-0016" } },
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  const notificationRows = (notifications.docs as AnyDoc[]).filter((doc) => {
    const blob = JSON.stringify({
      title: doc.title,
      summary: doc.summary,
      metadata: doc.metadata,
      module: doc.module,
    });
    return (
      blob.includes(`"requestId":${TARGET_REQUEST_ID}`) ||
      blob.includes(`"requestId":"${TARGET_REQUEST_ID}"`) ||
      blob.includes(`/requests/${TARGET_REQUEST_ID}`) ||
      blob.includes(`#${TARGET_REQUEST_ID}`) ||
      blob.includes("WS-0016") ||
      (blob.includes("Race · Programs") && blob.includes("website-workspace"))
    );
  });

  console.log("Linked attachments:", summarize(attachmentRows, (doc) => ({
    id: doc.id,
    filename: doc.originalFilename,
    relatedRequest: doc.relatedRequest,
  })));
  console.log("Linked timeline events:", summarize(eventRows, (doc) => ({
    id: doc.id,
    eventType: doc.eventType,
    title: doc.title,
  })));
  console.log("Linked client-tasks:", summarize(taskRows, (doc) => ({
    id: doc.id,
    title: doc.title ?? doc.taskTitle,
    sourceType: doc.sourceType ?? doc.createdFrom,
  })));
  console.log("Linked client-actions:", summarize(actionRows, (doc) => ({
    id: doc.id,
    title: doc.title,
  })));
  console.log("Linked client-communications:", summarize(communicationRows, (doc) => ({
    id: doc.id,
    subject: doc.subject ?? doc.title,
  })));
  console.log("Linked automation-notifications:", summarize(notificationRows, (doc) => ({
    id: doc.id,
    title: doc.title,
    module: doc.module,
  })));

  const deleted: Record<string, number[]> = {
    "client-review-media": [],
    "executive-timeline-events": [],
    "client-tasks": [],
    "client-actions": [],
    "client-communications": [],
    "automation-notifications": [],
    "client-requests": [],
  };

  for (const doc of attachmentRows) {
    await deleteMediaObject(doc);
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-review-media" as any,
      id: doc.id,
      overrideAccess: true,
    });
    deleted["client-review-media"].push(Number(doc.id));
    console.log(`Deleted attachment #${doc.id} (${doc.originalFilename})`);
  }

  for (const doc of eventRows) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-timeline-events" as any,
      id: doc.id,
      overrideAccess: true,
    });
    deleted["executive-timeline-events"].push(Number(doc.id));
    console.log(`Deleted timeline event #${doc.id}`);
  }

  for (const doc of taskRows) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-tasks" as any,
      id: doc.id,
      overrideAccess: true,
    });
    deleted["client-tasks"].push(Number(doc.id));
    console.log(`Deleted client-task #${doc.id}`);
  }

  for (const doc of actionRows) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-actions" as any,
      id: doc.id,
      overrideAccess: true,
    });
    deleted["client-actions"].push(Number(doc.id));
    console.log(`Deleted client-action #${doc.id}`);
  }

  for (const doc of communicationRows) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-communications" as any,
      id: doc.id,
      overrideAccess: true,
    });
    deleted["client-communications"].push(Number(doc.id));
    console.log(`Deleted client-communication #${doc.id}`);
  }

  for (const doc of notificationRows) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "automation-notifications" as any,
      id: doc.id,
      overrideAccess: true,
    });
    deleted["automation-notifications"].push(Number(doc.id));
    console.log(`Deleted automation-notification #${doc.id}`);
  }

  await payload.delete({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    id: TARGET_REQUEST_ID,
    overrideAccess: true,
  });
  deleted["client-requests"].push(TARGET_REQUEST_ID);
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
  const leftoverActions = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-actions" as any,
    where: { relatedRequest: { equals: TARGET_REQUEST_ID } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  const leftoverComms = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-communications" as any,
    where: { relatedRequest: { equals: TARGET_REQUEST_ID } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });

  let requestStillExists = false;
  try {
    await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-requests" as any,
      id: TARGET_REQUEST_ID,
      depth: 0,
      overrideAccess: true,
    });
    requestStillExists = true;
  } catch {
    requestStillExists = false;
  }

  const remainingWorkspace = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    where: { experienceModule: { equals: WEBSITE_WORKSPACE_EXPERIENCE_MODULE } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });

  console.log("\n=== DELETED ===");
  console.log(JSON.stringify(deleted, null, 2));
  console.log("\n=== POST-CLEANUP ===");
  console.log({
    requestStillExists,
    leftoverMedia: leftoverMedia.totalDocs,
    leftoverEvents: leftoverEvents.totalDocs,
    leftoverTasks: leftoverTasks.totalDocs,
    leftoverActions: leftoverActions.totalDocs,
    leftoverCommunications: leftoverComms.totalDocs,
    remainingWebsiteWorkspaceRequests: remainingWorkspace.totalDocs,
    remainingIds: (remainingWorkspace.docs as AnyDoc[]).map((doc) => doc.id),
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
