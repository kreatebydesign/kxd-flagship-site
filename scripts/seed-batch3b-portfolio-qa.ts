/**
 * Local QA only — extra portfolio clients for Batch 3B browser verification.
 * Requires PAYLOAD_SQLITE_PATH pointing at isolated QA sqlite.
 */
import { getSharedPayload } from "@/lib/payload/get-payload";

const FIXTURES = [
  {
    name: "B3B Searchable Slug Co",
    slug: "b3b-searchable-slug",
    status: "active",
    companyWebsite: "https://searchable.example",
    primaryContactName: "Pat Finder",
    primaryContactEmail: "finder@searchable.example",
    relationshipStatus: "healthy",
    monthlyRetainerAmount: 1200,
  },
  {
    name: "B3B Attention High",
    slug: "b3b-attention-high",
    status: "active",
    relationshipStatus: "needs-attention",
    monthlyRetainerAmount: 800,
    nextAction: "Renew scope",
    nextActionDueDate: "2026-11-10",
  },
  {
    name: "B3B Paused Only",
    slug: "b3b-paused-only",
    status: "paused",
    relationshipStatus: "healthy",
    monthlyRetainerAmount: 0,
  },
] as const;

async function main() {
  const payload = await getSharedPayload();
  for (const f of FIXTURES) {
    const existing = await payload.find({
      collection: "clients",
      where: { slug: { equals: f.slug } },
      limit: 1,
    });
    if (existing.docs.length > 0) {
      console.log(`  skip ${f.slug} (exists)`);
      continue;
    }
    const doc = await payload.create({
      collection: "clients",
      data: { ...f },
    });
    console.log(`  created client ${f.slug} id=${doc.id}`);
    if (f.slug === "b3b-attention-high") {
      await payload.create({
        collection: "executive-client-profiles",
        data: {
          client: doc.id,
          relationshipStatus: "at-risk",
          internalPriority: "high",
          currentMonthlyRevenue: f.monthlyRetainerAmount,
        },
      });
    }
  }
  console.log("Batch 3B QA portfolio fixtures ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});