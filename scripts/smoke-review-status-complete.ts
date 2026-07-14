/**
 * Smoke: website-review status → complete (and back) via updateReviewRequestStatus.
 * Run:
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/smoke-review-status-complete.ts
 */
import { getPayload } from "payload";
import config from "../payload.config";
import { updateReviewRequestStatus } from "../lib/website-review-inbox/data";
import { isReviewInboxStatus } from "../lib/website-review-inbox/status";

async function main() {
  const payload = await getPayload({ config });

  const found = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    where: {
      and: [
        { experienceModule: { equals: "website-review" } },
        { status: { not_equals: "complete" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const doc = found.docs[0] as { id: number; status?: string } | undefined;
  if (!doc) {
    console.log("No non-complete website-review request found — skip.");
    process.exit(0);
  }

  const id = Number(doc.id);
  const previous = String(doc.status ?? "new");
  if (!isReviewInboxStatus(previous)) {
    throw new Error(`Unexpected previous status: ${previous}`);
  }

  console.log(`Using request #${id} status=${previous}`);

  const t0 = Date.now();
  const completeResult = await updateReviewRequestStatus(id, "complete", {
    actorEmail: "smoke@kxd.local",
    clientCompletionNote: "Smoke completion note (optional path).",
  });
  const completeMs = Date.now() - t0;
  console.log("complete result:", completeResult, `(${completeMs}ms)`);

  if (!completeResult.ok || completeResult.status !== "complete") {
    throw new Error("Expected complete status in result.");
  }

  const after = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    id,
    depth: 0,
    overrideAccess: true,
  });
  if (String((after as { status?: string }).status) !== "complete") {
    throw new Error("DB did not persist complete.");
  }

  // Restore previous so inbox remains usable
  const restore = await updateReviewRequestStatus(
    id,
    previous as Parameters<typeof updateReviewRequestStatus>[1],
    { actorEmail: "smoke@kxd.local" },
  );
  console.log("restored:", restore);

  // Confirm API status validator rejects wrong enums
  console.log(
    "enum checks:",
    {
      complete: isReviewInboxStatus("complete"),
      completed: isReviewInboxStatus("completed"),
      Completed: isReviewInboxStatus("Completed"),
    },
  );

  if (completeMs > 8000) {
    console.warn(
      `WARN: complete took ${completeMs}ms — operational flow should not block this path.`,
    );
  } else {
    console.log(`OK: complete returned in ${completeMs}ms (non-blocking flow path).`);
  }
}

main()
  .then(() => {
    // Detached processOperationalFlow may keep the event loop alive — exit on purpose.
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
