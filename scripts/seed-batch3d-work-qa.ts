/**
 * Local QA only — Work fixtures for Batch 3D browser verification.
 * Requires PAYLOAD_SQLITE_PATH pointing at isolated QA sqlite.
 */
import { getSharedPayload } from "@/lib/payload/get-payload";
import { WORK_COLLECTION } from "@/lib/work/constants";

const TAG = "batch3d-qa";

async function findClientId(): Promise<number> {
  const payload = await getSharedPayload();
  const preferred = await payload.find({
    collection: "clients",
    where: { slug: { equals: "b3b-attention-high" } },
    limit: 1,
  });
  if (preferred.docs[0]?.id) return Number(preferred.docs[0].id);
  const any = await payload.find({ collection: "clients", limit: 1, sort: "id" });
  const id = any.docs[0]?.id;
  if (!id) throw new Error("No client in QA database");
  return Number(id);
}

async function findOperatorId(): Promise<number | null> {
  const payload = await getSharedPayload();
  const user = await payload.find({
    collection: "users",
    where: { email: { equals: "demo-operator@localhost.invalid" } },
    limit: 1,
  });
  const id = user.docs[0]?.id;
  return id != null ? Number(id) : null;
}

async function main() {
  const payload = await getSharedPayload();
  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    where: { title: { contains: `[${TAG}]` } },
    limit: 1,
  });
  if (existing.totalDocs > 0) {
    console.log(`  skip — ${TAG} fixtures already present`);
    return;
  }

  const clientId = await findClientId();
  const operatorId = await findOperatorId();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 3);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const now = new Date().toISOString();

  const items = [
    {
      title: `[${TAG}] Overdue launch checklist`,
      status: "in-progress",
      dueDate: yesterday.toISOString(),
      priority: "high",
    },
    {
      title: `[${TAG}] Due today content pass`,
      status: "planned",
      dueDate: today.toISOString(),
      priority: "normal",
    },
    {
      title: `[${TAG}] Waiting on client approval`,
      status: "waiting-on-client",
      dueDate: tomorrow.toISOString(),
      priority: "normal",
    },
    {
      title: `[${TAG}] Waiting on KXD staging`,
      status: "waiting-on-kxd",
      dueDate: tomorrow.toISOString(),
      priority: "low",
    },
  ] as const;

  for (const item of items) {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: WORK_COLLECTION as any,
      data: {
        client: clientId,
        title: item.title,
        summary: "Batch 3D QA fixture",
        category: "operations",
        status: item.status,
        priority: item.priority,
        dueDate: item.dueDate,
        source: "manual",
        clientVisible: false,
        timelineEnabled: false,
        assignedTo: operatorId ?? undefined,
        createdBy: "batch3d-seed",
        tags: [{ tag: TAG }],
        activityHistory: [{ at: now, actor: "batch3d-seed", action: "created", detail: "QA fixture" }],
      },
      overrideAccess: true,
    });
    console.log(`  created ${item.title}`);
  }

  console.log("Batch 3D QA work fixtures ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});