import { getPayload } from "payload";
import config from "../payload.config";
import { INVENTORY_COLLECTION } from "../lib/inventory/constants";

async function main() {
  const p = await getPayload({ config });
  const ws = await p.find({
    collection: "client-requests" as any,
    where: { experienceModule: { equals: "website-workspace" } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  const clients = await p.find({
    collection: "clients" as any,
    where: { slug: { equals: "primal-motorsports" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const client = clients.docs[0] as any;
  const inv = client
    ? await p.find({
        collection: INVENTORY_COLLECTION as any,
        where: { client: { equals: client.id } },
        limit: 30,
        depth: 0,
        overrideAccess: true,
      })
    : { totalDocs: 0, docs: [] };

  console.log(
    JSON.stringify(
      {
        websiteWorkspaceRequests: ws.totalDocs,
        clientId: client?.id,
        inventoryCollection: INVENTORY_COLLECTION,
        inventoryTotal: inv.totalDocs,
        inventory: (inv.docs as any[]).map((d) => ({
          id: d.id,
          title: d.title,
          status: d.listingStatus,
          featured: d.featured,
          slug: d.slug,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
