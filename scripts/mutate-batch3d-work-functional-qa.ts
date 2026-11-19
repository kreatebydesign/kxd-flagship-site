/**
 * Local QA only — server-side work mutations for functional verification
 * when browser API session is unavailable. Isolated sqlite only.
 */
import fs from "node:fs";
import path from "node:path";
import { getSharedPayload } from "@/lib/payload/get-payload";
import { createWork } from "@/lib/work/server";
import { updateWorkItem } from "@/lib/work/services";

const OUT = path.join(process.cwd(), "storage/perf/batch3d-work-visual/functional-mutation-meta.json");

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

async function main() {
  const stamp = Date.now();
  const title = `[batch3d-mutation-${stamp}]`;
  const clientId = await findClientId();
  const operatorId = await findOperatorId();

  const created = await createWork({
    clientId,
    title,
    summary: "Batch 3D functional QA",
    category: "operations",
    status: "new",
    priority: "normal",
    source: "manual",
    tags: ["batch3d-qa", "functional-mutation"],
    assignedToId: operatorId ?? undefined,
    createdBy: "functional-qa",
  });

  const workId = created.work.id;
  const editedTitle = `${title} (edited)`;
  await updateWorkItem({
    workId,
    title: editedTitle,
    assignedToId: operatorId ?? null,
    status: "planned",
  });
  await updateWorkItem({ workId, status: "in-progress" });
  await updateWorkItem({ workId, status: "completed" });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        workId,
        title,
        editedTitle,
        clientId,
        finalStatus: "completed",
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Functional mutation meta: workId=${workId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});